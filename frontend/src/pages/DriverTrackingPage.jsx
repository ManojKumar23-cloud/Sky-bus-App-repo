/**
 * DRIVER TRACKING PAGE — What the DRIVER sees on their phone.
 * Simple interface: START TRIP → GPS shares automatically → END TRIP
 *
 * URL: /driver/tracking/:tripId/:busId
 * Example: /driver/tracking/101/5
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function DriverTrackingPage() {
  const { tripId, busId } = useParams();

  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState(null);
  const [pingCount, setPingCount] = useState(0);
  const [watchers, setWatchers] = useState(0);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [tripDuration, setTripDuration] = useState(0);

  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const locationRef = useRef(null);
  const timerRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ─── START TRACKING ───
  const handleStart = async () => {
    try {
      setError(null);

      // 1. Tell server: "I'm starting this trip"
      const res = await fetch(`${API_URL}/api/tracking/session/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          bus_id: parseInt(busId),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to start session");
      }

      const session = await res.json();
      setSessionId(session.session_id);
      setIsTracking(true);

      // 2. Start reading GPS from phone
      if (!navigator.geolocation) {
        throw new Error("GPS not available on this device");
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
            heading: pos.coords.heading || 0,
            accuracy_meters: pos.coords.accuracy || 0,
          };
          setLocation(loc);
          locationRef.current = loc;
        },
        (err) => setError(`GPS Error: ${err.message}. Please enable location.`),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // 3. Send GPS to server every 5 seconds
      intervalRef.current = setInterval(sendPing, 5000);

      // 4. Trip duration timer
      timerRef.current = setInterval(() => {
        setTripDuration((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      setError(err.message);
      setIsTracking(false);
    }
  };

  // ─── SEND GPS PING TO SERVER ───
  const sendPing = async () => {
    const loc = locationRef.current;
    if (!loc) return;

    try {
      const res = await fetch(`${API_URL}/api/tracking/ping`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          trip_id: parseInt(tripId),
          ...loc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPingCount((prev) => prev + 1);
        setWatchers(data.watchers || 0);
      }
    } catch (err) {
      console.error("Ping failed — will retry in 5 sec:", err);
    }
  };

  // ─── STOP TRACKING ───
  const handleStop = async () => {
    // Stop GPS
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // Stop ping interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Tell server: "Trip is done"
    try {
      await fetch(`${API_URL}/api/tracking/session/end/${tripId}`, {
        method: "POST",
        headers,
      });
    } catch (err) {
      console.error("Failed to end session:", err);
    }

    setIsTracking(false);
    setSessionId(null);
  };

  // Format duration as HH:MM:SS
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Cleanup on page close
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-2xl font-bold text-gray-800">🚌 Driver Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Share live location with passengers</p>
        </div>

        {/* Trip Info */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase">Trip</p>
              <p className="text-2xl font-bold text-gray-800">#{tripId}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase">Bus</p>
              <p className="text-2xl font-bold text-gray-800">#{busId}</p>
            </div>
          </div>
        </div>

        {/* Live Status */}
        {isTracking && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="font-bold text-green-800 text-lg">LIVE</span>
              </div>
              <span className="text-sm bg-white px-3 py-1 rounded-full text-green-700 font-medium">
                {formatDuration(tripDuration)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-400">Pings</p>
                <p className="text-xl font-bold text-blue-600">{pingCount}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-400">Speed</p>
                <p className="text-xl font-bold text-blue-600">
                  {location ? Math.round(location.speed_kmh) : 0}
                </p>
                <p className="text-xs text-gray-400">km/h</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-400">Watching</p>
                <p className="text-xl font-bold text-purple-600">{watchers}</p>
                <p className="text-xs text-gray-400">passengers</p>
              </div>
            </div>

            {location && (
              <div className="mt-3 bg-white rounded-lg p-3">
                <p className="text-xs text-gray-400">GPS Coordinates</p>
                <p className="font-mono text-xs text-gray-700 mt-1">
                  📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Accuracy: ±{Math.round(location.accuracy_meters)}m | Heading: {Math.round(location.heading)}°
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* START / STOP Button */}
        {!isTracking ? (
          <button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white py-6 rounded-xl font-bold text-xl shadow-lg transition-all"
          >
            ▶️ START TRIP
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white py-6 rounded-xl font-bold text-xl shadow-lg transition-all"
          >
            ⏹️ END TRIP
          </button>
        )}

        {/* Instructions */}
        {!isTracking && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-700 mb-3">📋 Before Starting:</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Make sure <strong>GPS/Location</strong> is turned ON in phone settings</li>
              <li>Keep this page <strong>open</strong> during the entire trip</li>
              <li>Allow location permission when browser asks</li>
              <li>Keep phone <strong>charged</strong> (GPS uses battery)</li>
              <li>Press <strong>"END TRIP"</strong> when you reach destination</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
