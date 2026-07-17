"""
Database models for GPS live tracking.
Stores every location ping from driver and tracking sessions.
"""
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class BusLocation(Base):
    """
    Every GPS ping from driver is stored here.
    One row = one location point (every 5 seconds).
    For a 6-hour trip: ~4,320 rows per trip.
    """
    __tablename__ = "bus_locations"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, nullable=False, index=True)
    trip_id = Column(Integer, nullable=False, index=True)
    driver_id = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)          # e.g., 12.9716
    longitude = Column(Float, nullable=False)         # e.g., 77.5946
    speed_kmh = Column(Float, default=0.0)            # Current speed
    heading = Column(Float, default=0.0)              # Direction 0-360°
    accuracy_meters = Column(Float, default=0.0)      # GPS accuracy
    is_active = Column(Boolean, default=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())


class TrackingSession(Base):
    """
    One session per trip.
    Created when driver clicks "START TRIP".
    Ended when driver clicks "END TRIP".
    """
    __tablename__ = "tracking_sessions"

    id = Column(Integer, primary_key=True, index=True)
    bus_id = Column(Integer, nullable=False)
    trip_id = Column(Integer, nullable=False, unique=True)
    driver_id = Column(Integer, nullable=False)
    status = Column(String(20), default="active")     # active | paused | completed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
