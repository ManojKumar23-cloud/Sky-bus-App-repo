"""
Geographic calculations — distance between two GPS points, ETA, bearing.
Uses Haversine formula (accounts for Earth's curvature).
"""
import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two GPS coordinates in KILOMETERS.

    Example:
        haversine_distance(12.97, 77.59, 13.08, 80.27) → ~290 km (Bangalore to Chennai)
    """
    R = 6371.0  # Earth's radius in km

    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (math.sin(dlat / 2) ** 2 +
         math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def calculate_eta_minutes(distance_km: float, current_speed_kmh: float) -> int:
    """
    Calculate ETA in minutes.
    If bus is stopped/slow, assumes average intercity bus speed of 45 km/h.

    Example:
        calculate_eta_minutes(90, 60) → 90 minutes
        calculate_eta_minutes(90, 0)  → 120 minutes (uses default 45 km/h)
    """
    if current_speed_kmh < 5:
        current_speed_kmh = 45.0  # Default average speed

    eta_hours = distance_km / current_speed_kmh
    return max(1, int(eta_hours * 60))


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate compass direction from point A to point B.
    Returns degrees: 0=North, 90=East, 180=South, 270=West
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)

    x = math.sin(dlon) * math.cos(lat2_r)
    y = (math.cos(lat1_r) * math.sin(lat2_r) -
         math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon))

    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360
