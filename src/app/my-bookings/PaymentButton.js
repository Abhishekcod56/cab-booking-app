
"use client";

import { useState } from "react";

export default function PaymentButton({ bookingId, paymentStatus }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (paymentStatus === "paid") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-800">
        ✓ Paid
      </span>
    );
  }

  async function handlePayment() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not start payment.");
      }

      if (!result.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = result.url;
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className="rounded-xl bg-yellow-400 px-5 py-3 font-bold text-gray-900 hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening checkout..." : "Pay Now"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
