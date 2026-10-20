
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

function formatCoordinates(latitude, longitude) {
  if (
    latitude == null ||
    longitude == null ||
    latitude === "" ||
    longitude === ""
  ) {
    return null;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function LocationDetails({
  title,
  name,
  latitude,
  longitude,
}) {
  const coordinates = formatCoordinates(
    latitude,
    longitude
  );

  const mapUrl =
    coordinates &&
    `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      latitude
    )}&mlon=${encodeURIComponent(
      longitude
    )}#map=16/${encodeURIComponent(
      latitude
    )}/${encodeURIComponent(longitude)}`;

  return (
    <div className="rounded-xl border p-4">
      <p className="text-sm text-gray-500">{title}</p>

      <p className="mt-1 break-words font-semibold">
        {name || "Not available"}
      </p>

      <p className="mt-3 text-sm text-gray-500">
        Coordinates
      </p>

      {coordinates ? (
        <>
          <p className="mt-1 break-all font-mono text-sm text-gray-700">
            {coordinates}
          </p>

          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-semibold text-blue-700 underline"
          >
            View on map
          </a>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-500">
          Coordinates not available for this booking.
        </p>
      )}
    </div>
  );
}

function TrackRideContent() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [driverLocation, setDriverLocation] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bookingId) return;

    let active = true;

    async function loadTracking() {
      try {
        const response = await fetch(
          `/api/bookings/${bookingId}/location`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to load ride tracking."
          );
        }

        if (!active) return;

        setBooking(data.booking || data);

        setDriverLocation(
          data.location ||
            data.driverLocation ||
            data.rideLocation ||
            null
        );

        setError("");
      } catch (err) {
        if (active) {
          setError(
            err.message || "Unable to load ride tracking."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTracking();

    const interval = setInterval(loadTracking, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [bookingId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">
          Loading ride tracking...
        </p>
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-xl font-bold text-red-600">
            Unable to load tracking
          </h1>

          <p className="mt-3 text-gray-600">{error}</p>

          <button
            onClick={() => router.refresh()}
            className="mt-5 rounded-xl bg-yellow-400 px-5 py-3 font-bold"
          >
            Try again
          </button>

          <Link
            href="/my-bookings"
            className="ml-4 text-blue-700 underline"
          >
            My bookings
          </Link>
        </div>
      </main>
    );
  }

  const status = booking?.status || "requested";
  const location = driverLocation;

  const latitude =
    location?.latitude ?? location?.lat;

  const longitude =
    location?.longitude ??
    location?.lng ??
    location?.lon;

  const driverCoordinates = formatCoordinates(
    latitude,
    longitude
  );

  const driverMapUrl =
    driverCoordinates &&
    `https://www.openstreetmap.org/?mlat=${encodeURIComponent(
      latitude
    )}&mlon=${encodeURIComponent(
      longitude
    )}#map=16/${encodeURIComponent(
      latitude
    )}/${encodeURIComponent(longitude)}`;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/my-bookings"
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          ← Back to My Bookings
        </Link>

        <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold">
            Live Ride Tracking
          </h1>

          <p className="mt-2 break-all text-sm text-gray-500">
            Booking ID: {bookingId}
          </p>

          <div className="mt-5 rounded-xl bg-yellow-50 p-4">
            <p className="text-sm text-gray-600">
              Ride status
            </p>

            <p className="mt-1 text-lg font-bold capitalize">
              {String(status).replaceAll("_", " ")}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <LocationDetails
              title="Pickup"
              name={booking?.pickup}
              latitude={booking?.pickup_latitude}
              longitude={booking?.pickup_longitude}
            />

            <LocationDetails
              title="Destination"
              name={booking?.destination}
              latitude={booking?.destination_latitude}
              longitude={booking?.destination_longitude}
            />
          </div>

          <div className="mt-6 rounded-xl border p-4">
            <h2 className="font-bold">Driver location</h2>

            {driverCoordinates ? (
              <>
                <p className="mt-2 text-sm text-gray-600">
                  Latitude: {latitude}
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Longitude: {longitude}
                </p>

                <a
                  href={driverMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block font-semibold text-blue-700 underline"
                >
                  View driver on map
                </a>

                {location?.updated_at && (
                  <p className="mt-3 text-xs text-gray-500">
                    Last location update:{" "}
                    {new Date(
                      location.updated_at
                    ).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                Driver location is not available yet. It
                will refresh automatically.
              </p>
            )}
          </div>

          {error && (
            <p className="mt-4 text-sm text-amber-700">
              Latest update failed: {error}
            </p>
          )}

          <p className="mt-4 text-xs text-gray-400">
            Tracking refreshes every 5 seconds while this
            page is open.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function TrackRidePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-gray-600">
            Loading ride tracking...
          </p>
        </main>
      }
    >
      <TrackRideContent />
    </Suspense>
  );
}
