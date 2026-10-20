
"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

export default function ShareLocationPage() {
  const { bookingId } = useParams();

  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState(
    "Start sharing when your ride is in progress."
  );

  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  async function sendLocation(position) {
    const now = Date.now();

    if (now - lastSentRef.current < 5000) {
      return;
    }

    lastSentRef.current = now;

    try {
      const response = await fetch(
        `/api/bookings/${bookingId}/location`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not share location.");
        return;
      }

      setMessage(
        `Location updated at ${new Date().toLocaleTimeString()}.`
      );
    } catch {
      setMessage("Network error. Please try again.");
    }
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setMessage("This browser does not support GPS location.");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setMessage("Waiting for GPS location...");

    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access in your browser.",
          2: "Your current location is unavailable.",
          3: "GPS request timed out. Try again.",
        };

        setMessage(
          messages[error.code] || "Could not access GPS location."
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    setSharing(true);
  }

  function stopSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setSharing(false);
    setMessage("Location sharing stopped on this device.");
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-bold">
        Share Driver Location
      </h1>

      <p className="mt-2 text-gray-600">
        Booking ID: {bookingId}
      </p>

      <div className="mt-6 rounded-xl border p-4">
        <p aria-live="polite">{message}</p>

        <button
          type="button"
          onClick={startSharing}
          disabled={sharing}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-3 text-white disabled:opacity-50"
        >
          Start Sharing Location
        </button>

        <button
          type="button"
          onClick={stopSharing}
          disabled={!sharing}
          className="mt-3 w-full rounded-lg bg-gray-700 px-4 py-3 text-white disabled:opacity-50"
        >
          Stop Sharing
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Keep this page open during the ride. Location access
        requires your permission, and background tracking is not
        guaranteed when the browser or phone is suspended.
      </p>
    </main>
  );
}
