
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";

const NEXT_ACTION = {
  requested: {
    status: "accepted",
    label: "Accept ride",
  },
  accepted: {
    status: "in_progress",
    label: "Start ride",
  },
  in_progress: {
    status: "completed",
    label: "Complete ride",
  },
};

export default function DriverDashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyRide, setBusyRide] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRides = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return;
    }

    try {
      setError("");

      const token = await getToken();

      const response = await fetch("/api/driver/rides", {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load driver rides.");
      }

      setRides(result.rides || []);
    } catch (err) {
      setError(err.message || "Could not load driver rides.");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  async function updateStatus(rideId, status) {
    try {
      setBusyRide(rideId);
      setError("");
      setNotice("");

      const token = await getToken();

      const response = await fetch(
        `/api/bookings/${rideId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update ride.");
      }

      setNotice(result.message || "Ride updated successfully.");
      await loadRides();
    } catch (err) {
      setError(err.message || "Could not update ride.");
    } finally {
      setBusyRide(null);
    }
  }

  if (!isLoaded) {
    return <main className="p-8">Loading your account...</main>;
  }

  if (!isSignedIn) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
        <p className="mt-3">Please sign in to continue.</p>
        <Link
          href="/sign-in"
          className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            CabGo Driver
          </p>
          <h1 className="mt-1 text-3xl font-bold">Driver Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your assigned rides.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Back to home
        </Link>
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="mt-6 rounded-lg bg-green-50 p-4 text-green-800">
          {notice}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Your rides</h2>
        <button
          onClick={loadRides}
          disabled={loading}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh rides"}
        </button>
      </div>

      {loading ? (
        <p className="mt-5 text-gray-600">Loading rides...</p>
      ) : rides.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed p-8 text-center">
          <h3 className="text-lg font-semibold">No assigned rides yet</h3>
          <p className="mt-2 text-gray-600">
            Rides assigned to your driver account will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-5">
          {rides.map((ride) => {
            const action = NEXT_ACTION[ride.status];

            return (
              <article
                key={ride.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">
                      Ride ID: {ride.id}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold">
                      {ride.pickup}
                    </h3>
                    <p className="my-1 text-gray-400">↓</p>
                    <p className="font-medium">{ride.destination}</p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium capitalize text-blue-800">
                    {ride.status.replaceAll("_", " ")}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <p>
                    Distance:{" "}
                    {ride.distance_km == null
                      ? "Unavailable"
                      : `${ride.distance_km} km`}
                  </p>
                  <p>
                    Fare:{" "}
                    {ride.fare_amount == null
                      ? "Unavailable"
                      : `₹${Number(ride.fare_amount).toFixed(2)}`}
                  </p>
                  <p>
                    Payment:{" "}
                    <span className="capitalize">
                      {(ride.payment_status || "unpaid").replaceAll("_", " ")}
                    </span>
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {action && (
                    <button
                      onClick={() => updateStatus(ride.id, action.status)}
                      disabled={busyRide !== null}
                      className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {busyRide === ride.id ? "Updating..." : action.label}
                    </button>
                  )}

                  {ride.status === "in_progress" && (
                    <Link
                      href={`/driver/share-location/${ride.id}`}
                      className="rounded-lg border px-4 py-2 font-medium hover:bg-gray-50"
                    >
                      Share live location
                    </Link>
                  )}

                  {ride.status === "completed" && (
                    <span className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700">
                      Ride completed
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
