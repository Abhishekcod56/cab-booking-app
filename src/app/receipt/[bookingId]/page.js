
import { Suspense } from "react";
import { connection } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import Link from "next/link";
import PrintButton from "./PrintButton";

function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ReceiptLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-gray-600">
          Loading your CabGo receipt...
        </p>
      </div>
    </main>
  );
}

function ReceiptMessage({ title, message }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          {title}
        </h1>
        <p className="mb-6 text-gray-600">{message}</p>
        <Link
          href="/my-bookings"
          className="inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Back to My Bookings
        </Link>
      </div>
    </main>
  );
}

async function ReceiptContent({ bookingId }) {
  // Request-time APIs must be accessed inside the Suspense boundary.
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

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "id, clerk_user_id, pickup, destination, created_at, fare_amount, payment_status, stripe_payment_intent_id"
    )
    .eq("id", bookingId)
    .eq("clerk_user_id", userId)
    .eq("payment_status", "paid")
    .maybeSingle();

  if (error) {
    console.error("Receipt lookup failed:", error.message);

    return (
      <ReceiptMessage
        title="Unable to Load Receipt"
        message="We couldn't retrieve your receipt. Please try again later."
      />
    );
  }

  if (!booking) {
    return (
      <ReceiptMessage
        title="Receipt Unavailable"
        message="We couldn't find a paid receipt for this booking."
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
          <div className="bg-blue-700 px-6 py-8 text-center text-white">
            <h1 className="text-3xl font-extrabold tracking-wide">
              CabGo
            </h1>
            <p className="mt-2 text-blue-100">
              Ride payment receipt
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold text-green-700">
              <span aria-hidden="true">✓</span>
              PAID
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <section>
              <p className="text-sm text-gray-500">
                Booking ID
              </p>
              <p className="mt-1 break-all font-semibold text-gray-900">
                {booking.id}
              </p>
            </section>

            <section>
              <p className="text-sm text-gray-500">
                Booking date
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {formatDate(booking.created_at)}
              </p>
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
              <section className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">
                  Pickup
                </p>
                <p className="mt-2 wrap-break-word text-gray-900">
                  {booking.pickup}
                </p>
              </section>

              <section className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-500">
                  Destination
                </p>
                <p className="mt-2 wrap-break-word text-gray-900">
                  {booking.destination}
                </p>
              </section>
            </div>

            <section className="rounded-xl border border-dashed border-gray-300 p-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600">
                  Ride fare paid
                </span>
                <span className="text-2xl font-extrabold text-gray-900">
                  ₹
                  {Number(booking.fare_amount).toFixed(2)}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-200 pt-4">
                <span className="text-gray-600">
                  Payment status
                </span>
                <span className="font-bold text-green-700">
                  Paid
                </span>
              </div>
            </section>

            {booking.stripe_payment_intent_id && (
              <section>
                <p className="text-sm text-gray-500">
                  Stripe payment reference
                </p>
                <p className="mt-1 break-all font-mono text-sm text-gray-800">
                  {booking.stripe_payment_intent_id}
                </p>
              </section>
            )}

            <div className="border-t border-gray-200 pt-6 text-center">
              <h2 className="text-lg font-bold text-gray-900">
                Thank you for riding with CabGo!
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                This receipt confirms the payment recorded by CabGo.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <PrintButton />
              </div>

              <Link
                href="/my-bookings"
                className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-5 py-3 text-center font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Back to My Bookings
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          CabGo · Thank you for choosing us.
        </p>
      </div>
    </main>
  );
}

async function ReceiptParams({ params }) {
  const { bookingId } = await params;

  return <ReceiptContent bookingId={bookingId} />;
}

export default function ReceiptPage({ params }) {
  return (
    <Suspense fallback={<ReceiptLoading />}>
      <ReceiptParams params={params} />
    </Suspense>
  );
}
