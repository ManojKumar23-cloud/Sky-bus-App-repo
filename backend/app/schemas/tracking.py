"""
Pydantic schemas — validates all request/response data.
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class LocationPing(BaseModel):
    """Driver sends this every 5 seconds"""
    trip_id: int
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed_kmh: Optional[float] = 0.0
    heading: Optional[float] = 0.0
    accuracy_meters: Optional[float] = 0.0


class BusPositionResponse(BaseModel):
    """Customer receives this"""
    trip_id: int
    bus_id: int
    latitude: float
    longitude: float
    speed_kmh: float
    heading: float
    recorded_at: datetime
    eta_minutes: Optional[int] = None
    distance_km: Optional[float] = None

    class Config:
        from_attributes = True


class StartSessionRequest(BaseModel):
    """Driver starts tracking"""
    trip_id: int
    bus_id: int


class SessionResponse(BaseModel):
    """Response after starting session"""
    session_id: int
    trip_id: int
    bus_id: int
    status: str
    started_at: datetime


class ETAResponse(BaseModel):
    """ETA information for customer"""
    eta_minutes: int
    distance_km: float
    current_speed_kmh: float
