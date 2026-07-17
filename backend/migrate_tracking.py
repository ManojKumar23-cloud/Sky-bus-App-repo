"""
ONE-TIME SCRIPT: Creates the live tracking tables in your database.
Run this once locally AND once on Azure after deployment.

Usage: python migrate_tracking.py
"""
from app.database import engine, Base
from app.models.tracking import BusLocation, TrackingSession

print("=" * 50)
print("SKYBUS — Creating Live Tracking Tables")
print("=" * 50)

Base.metadata.create_all(bind=engine)

print("✅ Table created: bus_locations")
print("✅ Table created: tracking_sessions")
print("")
print("Live tracking is ready! Tables created successfully.")
print("=" * 50)
