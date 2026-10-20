
import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 text-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-10 w-10 text-green-600"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m5 12 4 4L19 6"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-3xl font-extrabold">
          Payment Successful!
        </h1>

        <p className="mt-4 text-gray-600">
          Thank you for choosing CabGo. Your payment has been received.
        </p>

        <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-800">
          Your payment confirmation is being processed. Your booking status
          will update automatically once Stripe confirms the payment.
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/my-bookings"
            className="rounded-xl bg-yellow-400 px-6 py-3 font-bold transition hover:bg-yellow-500"
          >
            View My Bookings
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-gray-200 px-6 py-3 font-semibold transition hover:bg-gray-50"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
