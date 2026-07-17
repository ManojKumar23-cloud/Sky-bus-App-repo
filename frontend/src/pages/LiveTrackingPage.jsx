/**
 * LIVE TRACKING PAGE — What the PASSENGER sees.
 * Shows a real map with bus icon moving in real-time.
 *
 * URL: /track/:tripId
 * Example: /track/101 → Shows live location of bus on trip 101
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Bus icon on map (emoji-based, no image file needed)
const busIcon = new L.DivIcon({
  html: `<div style="font-size:36px; filter:drop-shadow(2px 2px 2px rgba(0,0,0,0.3));">🚌</div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  className: "bus-marker",
});

// Auto-pan map to follow bus movement
function FollowBus({ position, shouldFollow }) {
  const map = useMap();
  useEffect(() => {
    if (position && shouldFollow) {
      map.panTo(position, { animate: true, duration: 1 });
    }
  }, [position, shouldFollow, map]);
  return null;
}

export default function LiveTrackingPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();

  // State
  const [busPosition, setBusPosition] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [status, setStatus] = useState("connecting");
  const [followBus, setFollowBus] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [watchers, setWatchers] = useState(0);

  const wsRef = useRef(null);
  const reconnectRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const WS_URL = API_URL.replace("https://", "wss://").replace("http://", "ws://");

  // ─── STEP A: Get initial position (REST call) ───
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tracking/live/${tripId}`);
        if (res.ok) {
          const data = await res.json();
          setBusPosition([data.latitude, data.longitude]);
          setSpeed(data.speed_kmh);
          setLastUpdate(new Date(data.recorded_at));
        }
      } catch (err) {
        console.log("Bus not tracked yet — waiting for driver to start");
      }
    };
    fetchInitial();
  }, [tripId, API_URL]);

  // ─── STEP B: Get route history (blue line) ───
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/tracking/history/${tripId}`);
        if (res.ok) {
          const data = await res.json();
          setRoutePath(data.map((p) => [p.lat, p.lng]));
        }
      } catch (err) {
        // No history yet — that's fine
      }
    };
    fetchHistory();
  }, [tripId, API_URL]);

  // ─── STEP C: Connect WebSocket for real-time updates ───
  const connectWebSocket = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}/api/tracking/ws/live/${tripId}`);

    ws.onopen = () => {
      setStatus("live");
      // Send ping every 25 seconds to keep connection alive
      ws._pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 25000);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "location_update") {
        // Bus moved! Update everything.
        const newPos = [data.latitude, data.longitude];
        setBusPosition(newPos);
        setSpeed(data.speed_kmh || 0);
        setLastUpdate(new Date(data.timestamp));
        setWatchers(data.watchers || 0);
        // Add to route path (blue line grows)
        setRoutePath((prev) => [...prev, newPos].slice(-500));
      }

      if (data.type === "trip_ended") {
        setStatus("ended");
      }
    };

    ws.onclose = () => {
      setStatus("offline");
      clearInterval(ws._pingInterval);
      // Auto-reconnect after 3 seconds
      reconnectRef.current = setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => setStatus("offline");

    wsRef.current = ws;
  }, [WS_URL, tripId]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWebSocket]);

  // ─── STEP D: Fetch ETA every 30 seconds ───
  useEffect(() => {
    const fetchETA = async () => {
      if (!busPosition) return;
      try {
        // TODO: Replace dest_lat/dest_lng with actual destination from booking
        const res = await fetch(
          `${API_URL}/api/tracking/eta/${tripId}?dest_lat=13.0827&dest_lng=80.2707`
        );
        if (res.ok) {
          const data = await res.json();
          setEta(data);
        }
      } catch (err) {
        // Silent fail
      }
    };
    fetchETA();
    const interval = setInterval(fetchETA, 30000);
    return () => clearInterval(interval);
  }, [tripId, busPosition, API_URL]);

  // Status badge config
  const statusConfig = {
    connecting: { color: "bg-yellow-400", text: "Connecting..." },
    live: { color: "bg-green-500 animate-pulse", text: "● LIVE" },
    offline: { color: "bg-red-500", text: "Reconnecting..." },
    ended: { color: "bg-gray-500", text: "Trip Completed" },
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ─── TOP BAR ─── */}
      <div className="bg-white shadow-lg px-4 py-3 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-gray-600 hover:text-gray-800 text-lg">
              ←
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-800">🚌 Track Your Bus</h1>
              <p className="text-xs text-gray-500">Trip #{tripId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Status */}
            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1 rounded-full">
              <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[status].color}`} />
              <span className="text-xs font-medium">{statusConfig[status].text}</span>
            </div>

            {/* Speed */}
            <div className="bg-blue-50 px-3 py-1 rounded-full">
              <span className="text-xs font-semibold text-blue-700">
                🏎️ {Math.round(speed)} km/h
              </span>
            </div>

            {/* Watchers */}
            {watchers > 0 && (
              <div className="bg-purple-50 px-3 py-1 rounded-full">
                <span className="text-xs font-semibold text-purple-700">
                  👁️ {watchers} tracking
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ETA Bar */}
        {eta && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex justify-between items-center">
            <span className="text-sm text-green-800 font-medium">
              ⏱️ Arriving in ~{eta.eta_minutes} minutes
            </span>
            <span className="text-xs text-green-600">
              {eta.distance_km} km away
            </span>
          </div>
        )}
      </div>

      {/* ─── MAP ─── */}
      <div className="flex-1 relative">
        {busPosition ? (
          <MapContainer center={busPosition} zoom={14} className="h-full w-full z-0" zoomControl={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />

            {/* Bus Marker */}
            <Marker position={busPosition} icon={busIcon}>
              <Popup>
                <strong>🚌 SkyBus</strong><br />
                Speed: {Math.round(speed)} km/h<br />
                {eta && <>ETA: {eta.eta_minutes} min</>}
              </Popup>
            </Marker>

            {/* Route line (blue) */}
            {routePath.length > 1 && (
              <Polyline
                positions={routePath}
                pathOptions={{ color: "#2563EB", weight: 4, opacity: 0.7 }}
              />
            )}

            <FollowBus position={busPosition} shouldFollow={followBus} />
          </MapContainer>
        ) : (
          /* Waiting state */
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center p-8">
              <div className="text-6xl mb-4">🚌</div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">Waiting for bus to start...</h2>
              <p className="text-gray-500 text-sm">
                Live tracking will begin once the driver starts the trip.<br />
                This page updates automatically — no need to refresh.
              </p>
              <div className="mt-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </div>
          </div>
        )}

        {/* Follow Bus toggle */}
        {busPosition && (
          <button
            onClick={() => setFollowBus(!followBus)}
            className={`absolute bottom-6 right-6 z-[1000] px-4 py-2 rounded-full shadow-lg font-medium text-sm ${
              followBus ? "bg-blue-600 text-white" : "bg-white text-gray-700 border"
            }`}
          >
            {followBus ? "📍 Following" : "📍 Follow Bus"}
          </button>
        )}

        {/* Last update time */}
        {lastUpdate && (
          <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 px-3 py-1 rounded-full text-xs text-gray-600 shadow">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}
