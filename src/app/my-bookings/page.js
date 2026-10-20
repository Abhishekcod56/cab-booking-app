
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import PaymentButton from "./PaymentButton";
import RatingForm from "@/components/RatingForm";
import NotificationBell from "@/components/NotificationBell";

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getStatusStyle(status) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "accepted":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-purple-100 text-purple-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function formatCoordinates(latitude, longitude) {
  if (
    latitude === null ||
    latitude === undefined ||
    longitude === null ||
    longitude === undefined ||
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    return null;
  }

  return `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
}

function LoadingBookings() {
  return (
    <div className="mt-8 rounded-2xl border bg-white p-8 text-center shadow-sm">
      <p className="text-gray-600">Loading your bookings...</p>
    </div>
  );
}

async function BookingsContent() {
  await connection();

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, pickup, destination, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, status, created_at, fare_amount, payment_status"
    )
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("My Bookings error:", error.message);

    return (
      <div className="mt-8 rounded-xl border border-red-200 bg-white p-6">
        <p className="font-semibold text-red-700">
          We couldn't load your bookings.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Please try again later.
        </p>
      </div>
    );
  }

  if (!bookings || bookings.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border bg-white p-10 text-center shadow-sm">
        <div className="text-4xl">🚕</div>
        <h2 className="mt-4 text-xl font-bold">No bookings yet</h2>
        <p className="mt-2 text-gray-600">
          Your ride requests will appear here after you book a ride.
        </p>
        <Link
          href="/#book"
          className="mt-6 inline-block rounded-xl bg-yellow-400 px-6 py-3 font-bold hover:bg-yellow-500"
        >
          Book a ride
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <p className="text-sm text-gray-500">
        {bookings.length}{" "}
        {bookings.length === 1 ? "booking" : "bookings"} found
      </p>

      {bookings.map((booking) => {
        const paymentStatus = booking.payment_status || "unpaid";
        const isPaid = paymentStatus === "paid";
        const canPay = booking.status === "completed" && !isPaid;

        const pickupCoordinates = formatCoordinates(
          booking.pickup_latitude,
          booking.pickup_longitude
        );

        const destinationCoordinates = formatCoordinates(
          booking.destination_latitude,
          booking.destination_longitude
        );

        return (
          <article
            key={booking.id}
            className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Booking ID</p>
                <p className="mt-1 break-all font-mono text-xs text-gray-700">
                  {booking.id}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                  booking.status
                )}`}
              >
                {(booking.status || "pending")
                  .replaceAll("_", " ")
                  .toUpperCase()}
              </span>
            </div>

            {/* Pickup and destination */}
            <div className="mt-6 space-y-5">
              <div className="flex gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-green-500" />

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Pickup
                  </p>

                  <p className="mt-1 font-semibold break-words">
                    {booking.pickup}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Coordinates
                  </p>

                  {pickupCoordinates ? (
                    <p className="mt-1 break-all font-mono text-sm text-gray-700">
                      {pickupCoordinates}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">
                      Coordinates not available for this booking
                    </p>
                  )}
                </div>
              </div>

              <div className="ml-1.5 h-5 border-l-2 border-dashed border-gray-300" />

              <div className="flex gap-3">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-red-500" />

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Destination
                  </p>

                  <p className="mt-1 font-semibold break-words">
                    {booking.destination}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Coordinates
                  </p>

                  {destinationCoordinates ? (
                    <p className="mt-1 break-all font-mono text-sm text-gray-700">
                      {destinationCoordinates}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400">
                      Coordinates not available for this booking
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Live ride tracking */}
            {booking.status === "in_progress" && (
              <div className="mt-5 border-t pt-4">
                <Link
                  href={`/track/${booking.id}`}
                  className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
                >
                  Track Ride
                </Link>
              </div>
            )}

            {/* Fare, payment, and receipt */}
            <div className="mt-6 border-t pt-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ride fare</p>

                  <p className="mt-1 text-xl font-extrabold">
                    ₹{Number(booking.fare_amount || 0).toFixed(2)}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Payment status:{" "}
                    <span
                      className={`font-bold ${
                        isPaid ? "text-green-700" : "text-gray-800"
                      }`}
                    >
                      {paymentStatus.toUpperCase()}
                    </span>
                  </p>
                </div>

                {isPaid ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
                      ✓ Paid
                    </span>

                    <Link
                      href={`/receipt/${booking.id}`}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold hover:bg-gray-50"
                    >
                      View Receipt
                    </Link>
                  </div>
                ) : canPay ? (
                  <PaymentButton
                    bookingId={booking.id}
                    paymentStatus={paymentStatus}
                  />
                ) : (
                  <span className="text-sm text-gray-500">
                    Pay after ride completion
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Requested on {formatDate(booking.created_at)}
            </div>

            {/* Review completed rides */}
            {booking.status === "completed" && (
              <div className="mt-5 border-t pt-4">
                <h3 className="mb-3 text-lg font-semibold">
                  Rate your ride
                </h3>
                <RatingForm bookingId={booking.id} />
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function MyBookingsPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-6 py-5 md:px-12">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-yellow-500">Cab</span>Go
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
          <Link href="/" className="hover:text-yellow-600">
            Home
          </Link>

          <Link href="/my-bookings" className="text-yellow-700">
            My Bookings
          </Link>

          <Link href="/about" className="hover:text-yellow-600">
            About
          </Link>

          <Link href="/contact" className="hover:text-yellow-600">
            Contact
          </Link>

          <Link href="/profile" className="hover:text-yellow-600">
            Profile
          </Link>

          <NotificationBell />
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">
          My Bookings
        </h1>

        <p className="mt-3 text-gray-600">
          View and track your CabGo ride requests.
        </p>

        <Suspense fallback={<LoadingBookings />}>
          <BookingsContent />
        </Suspense>

        <Link
          href="/"
          className="mt-8 inline-block font-semibold text-gray-700 hover:text-yellow-700"
        >
          ← Back to CabGo
        </Link>
      </section>
    </main>
  );
}
