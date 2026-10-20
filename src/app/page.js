
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LocationPickerLoader from "@/components/LocationPickerLoader";
import NotificationBell from "@/components/NotificationBell";

const PENDING_RIDE_KEY = "cabgo_pending_ride";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);

  const [fare, setFare] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [bookingRide, setBookingRide] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    try {
      const savedRide = sessionStorage.getItem(PENDING_RIDE_KEY);

      if (savedRide) {
        const ride = JSON.parse(savedRide);

        if (ride.pickup) setPickup(ride.pickup);
        if (ride.destination) setDestination(ride.destination);
        if (ride.pickupCoordinates) {
          setPickupCoordinates(ride.pickupCoordinates);
        }
        if (ride.destinationCoordinates) {
          setDestinationCoordinates(ride.destinationCoordinates);
        }

        sessionStorage.removeItem(PENDING_RIDE_KEY);
        setMessage(
          "Your previous ride details have been restored. Review them and request your ride."
        );
      }
    } catch {
      sessionStorage.removeItem(PENDING_RIDE_KEY);
    }
  }, [isLoaded, isSignedIn]);

  const resetEstimate = useCallback(() => {
    setFare(null);
    setDistance(null);
    setError("");
  }, []);

  function validateLocations() {
    if (!pickup.trim() || !destination.trim()) {
      setError("Please select both pickup and destination.");
      return false;
    }

    if (
      pickupCoordinates &&
      destinationCoordinates &&
      Number(pickupCoordinates.latitude) ===
        Number(destinationCoordinates.latitude) &&
      Number(pickupCoordinates.longitude) ===
        Number(destinationCoordinates.longitude)
    ) {
      setError("Pickup and destination must be different.");
      return false;
    }

    if (
      !pickupCoordinates &&
      !destinationCoordinates &&
      pickup.trim() === destination.trim()
    ) {
      setError("Pickup and destination must be different.");
      return false;
    }

    return true;
  }

  async function estimateFare() {
    setError("");
    setMessage("");

    if (!validateLocations()) return;

    setLoadingFare(true);

    try {
      const response = await fetch("/api/fare/estimate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup: pickup.trim(),
          destination: destination.trim(),
          pickupCoordinates,
          destinationCoordinates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to calculate the fare."
        );
      }

      const estimate = result.estimate || result;

      const estimatedFare =
        estimate.fare_amount ??
        estimate.fareAmount ??
        estimate.estimatedFare ??
        estimate.fare;

      const estimatedDistance =
        estimate.distance_km ??
        estimate.distanceKm ??
        estimate.distance;

      if (
        estimatedFare === undefined ||
        estimatedFare === null ||
        !Number.isFinite(Number(estimatedFare))
      ) {
        throw new Error(
          "The fare API did not return a valid fare. Please check the estimate API response."
        );
      }

      setFare(Number(estimatedFare));
      setDistance(
        estimatedDistance !== undefined &&
          estimatedDistance !== null &&
          Number.isFinite(Number(estimatedDistance))
          ? Number(estimatedDistance)
          : null
      );

      setMessage("Fare estimate calculated successfully.");
    } catch (err) {
      setError(err.message || "Something went wrong while estimating.");
    } finally {
      setLoadingFare(false);
    }
  }

  async function bookRide() {
    setError("");
    setMessage("");

    if (!validateLocations()) return;

    if (!isLoaded) {
      setError("Please wait while your account loads.");
      return;
    }

    if (!isSignedIn) {
      try {
        sessionStorage.setItem(
          PENDING_RIDE_KEY,
          JSON.stringify({
            pickup: pickup.trim(),
            destination: destination.trim(),
            pickupCoordinates,
            destinationCoordinates,
          })
        );
      } catch {
        // Booking details can be entered again after signing in.
      }

      router.push("/sign-in?redirect_url=%2F");
      return;
    }

    setBookingRide(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pickup: pickup.trim(),
          destination: destination.trim(),
          pickupCoordinates,
          destinationCoordinates,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not request your ride.");
      }

      const booking = result.booking || result;

      if (!booking.id) {
        throw new Error(
          "The booking response did not include a ride ID."
        );
      }

      try {
        sessionStorage.removeItem(PENDING_RIDE_KEY);
      } catch {
        // The booking has already been created.
      }

      setMessage("Ride requested successfully.");
      router.push("/my-bookings");
    } catch (err) {
      setError(err.message || "Could not book your ride.");
    } finally {
      setBookingRide(false);
    }
  }

  function handlePickupChange(value) {
    setPickup(value);
    resetEstimate();
  }

  function handleDestinationChange(value) {
    setDestination(value);
    resetEstimate();
  }

  function handlePickupCoordinatesChange(value) {
    setPickupCoordinates(value);
    resetEstimate();
  }

  function handleDestinationCoordinatesChange(value) {
    setDestinationCoordinates(value);
    resetEstimate();
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="text-2xl font-bold text-blue-700">
            CabGo
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm">
            <Link href="/" className="hover:text-blue-700">
              Home
            </Link>

            <Link href="/about" className="hover:text-blue-700">
              About
            </Link>

            {isLoaded && isSignedIn && (
              <>
                <Link href="/my-bookings" className="hover:text-blue-700">
                  My Bookings
                </Link>
                <Link href="/profile" className="hover:text-blue-700">
                  Profile
                </Link>
                <Link href="/contact" className="hover:text-blue-700">
                  Contact
                </Link>
                <NotificationBell />
                <UserButton />
              </>
            )}

            {isLoaded && !isSignedIn && (
              <Link
                href="/sign-in"
                className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-linear-to-r from-blue-800 to-blue-600 text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="mb-3 font-semibold uppercase tracking-wider text-blue-100">
            Your journey, made easier
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
            Book your ride with CabGo
          </h1>
          <p className="mt-4 max-w-2xl text-base text-blue-50 sm:text-lg">
            Select your pickup and destination, estimate your fare, and
            request a ride from one place.
          </p>
        </div>
      </section>

      {/* Booking */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-2xl font-bold">Plan your ride</h2>
            <p className="mt-2 text-sm text-gray-600">
              Choose a pickup and destination on the map, search for an
              address, or use your device's location.
            </p>

            <div className="mt-5">
              <LocationPickerLoader
                pickup={pickup}
                destination={destination}
                onPickupChange={handlePickupChange}
                onDestinationChange={handleDestinationChange}
                onPickupCoordinatesChange={handlePickupCoordinatesChange}
                onDestinationCoordinatesChange={handleDestinationCoordinatesChange}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={estimateFare}
                disabled={loadingFare || bookingRide}
                className="rounded-xl border border-blue-700 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingFare ? "Calculating..." : "Estimate Fare"}
              </button>

              <button
                type="button"
                onClick={bookRide}
                disabled={bookingRide || loadingFare || !isLoaded}
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bookingRide ? "Requesting Ride..." : "Book Ride"}
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {message && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              >
                {message}
              </p>
            )}
          </div>
        </div>

        {/* Fare summary */}
        <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Your fare estimate</h2>
          <p className="mt-2 text-sm text-gray-600">
            Select both locations and calculate the estimate to see your
            approximate trip cost.
          </p>

          <div className="my-5 border-t" />

          {fare !== null ? (
            <>
              <p className="text-sm text-gray-500">Estimated fare</p>
              <p className="mt-1 text-4xl font-bold text-blue-700">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 2,
                }).format(fare)}
              </p>

              {distance !== null && (
                <p className="mt-3 text-sm text-gray-600">
                  Estimated distance: {distance.toFixed(2)} km
                </p>
              )}

              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                This is an estimate. The final fare depends on the fare
                calculation and booking rules configured by CabGo.
              </p>
            </>
          ) : (
            <div className="rounded-xl bg-gray-50 p-5 text-center">
              <p className="text-3xl font-bold text-gray-300">₹ —</p>
              <p className="mt-2 text-sm text-gray-500">
                Your estimate will appear here.
              </p>
            </div>
          )}

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span aria-hidden="true">📍</span>
              <div className="min-w-0">
                <p className="font-semibold">Pickup</p>
                <p className="wrap-break-word text-gray-600">
                  {pickup || "Choose your pickup"}
                </p>
                {pickupCoordinates && (
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">
                    {Number(pickupCoordinates.latitude).toFixed(6)},{" "}
                    {Number(pickupCoordinates.longitude).toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span aria-hidden="true">🏁</span>
              <div className="min-w-0">
                <p className="font-semibold">Destination</p>
                <p className="wrap-break-word text-gray-600">
                  {destination || "Choose your destination"}
                </p>
                {destinationCoordinates && (
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">
                    {Number(destinationCoordinates.latitude).toFixed(6)},{" "}
                    {Number(destinationCoordinates.longitude).toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-3xl font-bold">About CabGo</h2>
          <p className="mt-4 max-w-3xl leading-7 text-gray-600">
            CabGo is a cab-booking application designed to help riders plan
            trips, request rides, follow ride status, and manage their
            bookings. The platform brings booking, driver workflows, and
            payment features together in one application.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/my-bookings"
              className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              View My Bookings
            </Link>
            <Link
              href="/contact"
              className="rounded-lg border px-5 py-3 font-semibold hover:bg-gray-50"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-gray-500 sm:px-6">
          <p>© 2026 CabGo</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-blue-700">
              About
            </Link>
            <Link href="/contact" className="hover:text-blue-700">
              Contact
            </Link>
            <Link href="/profile" className="hover:text-blue-700">
              Profile
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
