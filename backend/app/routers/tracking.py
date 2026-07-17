"""
LIVE TRACKING API — Complete router with REST + WebSocket endpoints.

DRIVER endpoints:
    POST /api/tracking/session/start    → Start sharing location
    POST /api/tracking/session/end/{id} → Stop sharing location
    POST /api/tracking/ping             → Send GPS coordinates (every 5 sec)

CUSTOMER endpoints:
    GET  /api/tracking/live/{trip_id}    → Get current bus position
    GET  /api/tracking/eta/{trip_id}     → Get ETA to destination
    GET  /api/tracking/history/{trip_id} → Get route path traveled
    GET  /api/tracking/status/{trip_id}  → Check if tracking is active
    WS   /api/tracking/ws/live/{trip_id} → Real-time WebSocket feed
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List

from app.database import get_db
from app.models.tracking import BusLocation, TrackingSession
from app.schemas.tracking import (
    LocationPing,
    BusPositionResponse,
    StartSessionRequest,
    SessionResponse,
    ETAResponse,
)
from app.services.geo_utils import haversine_distance, calculate_eta_minutes
from app.auth import get_current_user  # Your existing JWT auth

router = APIRouter(prefix="/api/tracking", tags=["Live Tracking"])


# ══════════════════════════════════════════════════════════════
# WEBSOCKET CONNECTION MANAGER
# ══════════════════════════════════════════════════════════════

class TrackingConnectionManager:
    """
    Manages WebSocket connections between server and passengers.

    When a passenger opens /track/101, their browser connects via WebSocket.
    When driver sends GPS ping for trip 101, this manager pushes it to
    ALL connected passengers watching trip 101.
    """

    def __init__(self):
        # Dictionary: { trip_id: [websocket1, websocket2, ...] }
        self.subscribers: Dict[int, List[WebSocket]] = {}

    async def subscribe(self, websocket: WebSocket, trip_id: int):
        """Passenger connects to watch a trip"""
        await websocket.accept()
        if trip_id not in self.subscribers:
            self.subscribers[trip_id] = []
        self.subscribers[trip_id].append(websocket)

    def unsubscribe(self, websocket: WebSocket, trip_id: int):
        """Passenger disconnects"""
        if trip_id in self.subscribers:
            if websocket in self.subscribers[trip_id]:
                self.subscribers[trip_id].remove(websocket)
            if not self.subscribers[trip_id]:
                del self.subscribers[trip_id]

    async def push_to_passengers(self, trip_id: int, data: dict):
        """
        Push GPS data to ALL passengers watching this trip.
        Called every time driver sends a ping.
        """
        if trip_id not in self.subscribers:
            return

        dead_connections = []
        for ws in self.subscribers[trip_id]:
            try:
                await ws.send_json(data)
            except Exception:
                dead_connections.append(ws)

        # Clean up broken connections
        for ws in dead_connections:
            self.unsubscribe(ws, trip_id)

    def get_watcher_count(self, trip_id: int) -> int:
        """How many passengers are currently watching this trip"""
        return len(self.subscribers.get(trip_id, []))


# Single instance — shared across all requests
ws_manager = TrackingConnectionManager()


# ══════════════════════════════════════════════════════════════
# DRIVER ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.post("/session/start", response_model=SessionResponse)
async def start_tracking(
    request: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    🚌 DRIVER calls this when clicking "START TRIP".
    Creates a tracking session in database.
    After this, driver can start sending GPS pings.
    """
    # Check if already tracking this trip
    existing = db.query(TrackingSession).filter(
        TrackingSession.trip_id == request.trip_id,
        TrackingSession.status == "active"
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Tracking already active for this trip")

    # Create new session
    session = TrackingSession(
        bus_id=request.bus_id,
        trip_id=request.trip_id,
        driver_id=current_user.id,
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return SessionResponse(
        session_id=session.id,
        trip_id=session.trip_id,
        bus_id=session.bus_id,
        status=session.status,
        started_at=session.started_at,
    )


@router.post("/session/end/{trip_id}")
async def end_tracking(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    🚌 DRIVER calls this when clicking "END TRIP".
    Ends the session and notifies all watching passengers.
    """
    session = db.query(TrackingSession).filter(
        TrackingSession.trip_id == trip_id,
        TrackingSession.status == "active"
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="No active session for this trip")

    # Mark session as completed
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    db.commit()

    # Notify all passengers: "Trip completed!"
    await ws_manager.push_to_passengers(trip_id, {
        "type": "trip_ended",
        "trip_id": trip_id,
        "message": "Bus has reached the destination. Trip completed!"
    })

    return {"message": "Tracking ended successfully", "trip_id": trip_id}


@router.post("/ping")
async def receive_gps_ping(
    ping: LocationPing,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    🚌 DRIVER'S PHONE calls this EVERY 5 SECONDS automatically.

    This is the CORE of live tracking:
    1. Receives GPS coordinates from driver's phone
    2. Saves to database (for history/analytics)
    3. Pushes to all passengers watching this trip via WebSocket

    The driver doesn't manually call this — the JavaScript on driver's
    page calls it automatically using setInterval(5000).
    """
    # Verify session exists
    session = db.query(TrackingSession).filter(
        TrackingSession.trip_id == ping.trip_id,
        TrackingSession.status == "active"
    ).first()

    if not session:
        raise HTTPException(
            status_code=400,
            detail="No active tracking session. Driver must click START TRIP first."
        )

    # 1. SAVE to database
    location = BusLocation(
        bus_id=session.bus_id,
        trip_id=ping.trip_id,
        driver_id=current_user.id,
        latitude=ping.latitude,
        longitude=ping.longitude,
        speed_kmh=ping.speed_kmh,
        heading=ping.heading,
        accuracy_meters=ping.accuracy_meters,
    )
    db.add(location)
    db.commit()

    # 2. PUSH to all watching passengers via WebSocket
    broadcast_data = {
        "type": "location_update",
        "trip_id": ping.trip_id,
        "bus_id": session.bus_id,
        "latitude": ping.latitude,
        "longitude": ping.longitude,
        "speed_kmh": ping.speed_kmh,
        "heading": ping.heading,
        "timestamp": datetime.utcnow().isoformat(),
        "watchers": ws_manager.get_watcher_count(ping.trip_id),
    }
    await ws_manager.push_to_passengers(ping.trip_id, broadcast_data)

    return {
        "status": "ok",
        "watchers": ws_manager.get_watcher_count(ping.trip_id),
    }


# ══════════════════════════════════════════════════════════════
# CUSTOMER ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/live/{trip_id}", response_model=BusPositionResponse)
async def get_current_position(trip_id: int, db: Session = Depends(get_db)):
    """
    👤 CUSTOMER calls this to get the LATEST bus position.
    Used when customer first opens the tracking page (before WebSocket connects).
    """
    location = (
        db.query(BusLocation)
        .filter(BusLocation.trip_id == trip_id, BusLocation.is_active == True)
        .order_by(BusLocation.recorded_at.desc())
        .first()
    )

    if not location:
        raise HTTPException(
            status_code=404,
            detail="Bus is not being tracked yet. Tracking starts when driver begins the trip."
        )

    return BusPositionResponse(
        trip_id=location.trip_id,
        bus_id=location.bus_id,
        latitude=location.latitude,
        longitude=location.longitude,
        speed_kmh=location.speed_kmh,
        heading=location.heading,
        recorded_at=location.recorded_at,
    )


@router.get("/eta/{trip_id}")
async def get_eta(
    trip_id: int,
    dest_lat: float,
    dest_lng: float,
    db: Session = Depends(get_db),
):
    """
    👤 CUSTOMER calls this to get ETA to their destination stop.

    Example: GET /api/tracking/eta/101?dest_lat=13.08&dest_lng=80.27
    Response: { eta_minutes: 45, distance_km: 38.5, current_speed_kmh: 65 }
    """
    location = (
        db.query(BusLocation)
        .filter(BusLocation.trip_id == trip_id, BusLocation.is_active == True)
        .order_by(BusLocation.recorded_at.desc())
        .first()
    )

    if not location:
        raise HTTPException(status_code=404, detail="Bus not being tracked")

    distance = haversine_distance(
        location.latitude, location.longitude, dest_lat, dest_lng
    )
    eta = calculate_eta_minutes(distance, location.speed_kmh)

    return ETAResponse(
        eta_minutes=eta,
        distance_km=round(distance, 2),
        current_speed_kmh=location.speed_kmh,
    )


@router.get("/history/{trip_id}")
async def get_route_history(trip_id: int, db: Session = Depends(get_db)):
    """
    👤 CUSTOMER calls this to get the path bus has already traveled.
    Used to draw the blue route line on the map.
    """
    locations = (
        db.query(BusLocation)
        .filter(BusLocation.trip_id == trip_id)
        .order_by(BusLocation.recorded_at.asc())
        .limit(500)
        .all()
    )

    return [
        {
            "lat": loc.latitude,
            "lng": loc.longitude,
            "speed": loc.speed_kmh,
            "time": loc.recorded_at.isoformat(),
        }
        for loc in locations
    ]


@router.get("/status/{trip_id}")
async def get_tracking_status(trip_id: int, db: Session = Depends(get_db)):
    """
    👤 CUSTOMER checks if tracking is active for their trip.
    Returns: is the driver currently sharing location or not?
    """
    session = db.query(TrackingSession).filter(
        TrackingSession.trip_id == trip_id
    ).order_by(TrackingSession.started_at.desc()).first()

    if not session:
        return {
            "trip_id": trip_id,
            "tracking_active": False,
            "message": "Driver has not started the trip yet"
        }

    return {
        "trip_id": trip_id,
        "tracking_active": session.status == "active",
        "status": session.status,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "watchers": ws_manager.get_watcher_count(trip_id),
    }


# ══════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT (Real-time connection for customers)
# ══════════════════════════════════════════════════════════════

@router.websocket("/ws/live/{trip_id}")
async def websocket_live_tracking(websocket: WebSocket, trip_id: int):
    """
    👤 CUSTOMER'S BROWSER connects here via WebSocket.

    How it works:
    1. Customer opens /track/101
    2. JavaScript connects: new WebSocket("wss://skybus-api.../api/tracking/ws/live/101")
    3. Connection stays OPEN
    4. Every time driver sends GPS ping → this pushes it to customer instantly
    5. Customer's map updates bus icon position

    No polling needed — data is PUSHED to customer in real-time.
    """
    await ws_manager.subscribe(websocket, trip_id)

    try:
        while True:
            # Keep connection alive — listen for client pings
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat()
                })
    except WebSocketDisconnect:
        ws_manager.unsubscribe(websocket, trip_id)
