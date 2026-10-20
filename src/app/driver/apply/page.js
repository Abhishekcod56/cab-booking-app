
"use client";

import { useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import Link from "next/link";

const initialForm = {
  fullName: "",
  phone: "",
  vehicleType: "car",
  vehicleRegistration: "",
  licenseNumber: "",
};

export default function DriverApplyPage() {
  const { isLoaded, isSignedIn } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitApplication(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/driver/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not submit your application.");
      }

      setIsApproved(result.isApproved === true);
      setSubmitted(true);
      setMessage(result.message || "Application saved.");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        Loading your account...
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Become a CabGo driver</h1>
          <p className="mt-3 text-slate-600">
            Sign in before submitting a driver application.
          </p>
          <div className="mt-6">
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">
                Sign in to continue
              </button>
            </SignInButton>
          </div>
          <Link href="/" className="mt-5 inline-block text-blue-600 hover:underline">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          CabGo Driver Program
        </p>
        <h1 className="mt-2 text-3xl font-bold">Driver application</h1>
        <p className="mt-3 leading-7 text-slate-600">
          Enter your details below. Your application will remain pending until
          an administrator reviews it.
        </p>

        {error && (
          <div role="alert" className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div role="status" className="mt-5 rounded-lg bg-blue-50 p-4 text-blue-800">
            {message}
          </div>
        )}

        {!isApproved && (
          <form onSubmit={submitApplication} className="mt-7 space-y-5">
            <div>
              <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={updateField}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                autoComplete="tel"
                minLength={7}
                maxLength={20}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:border-blue-500"
                placeholder="Enter your contact number"
              />
            </div>

            <div>
              <label htmlFor="vehicleType" className="mb-2 block text-sm font-medium">
                Vehicle type
              </label>
              <select
                id="vehicleType"
                name="vehicleType"
                value={form.vehicleType}
                onChange={updateField}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 outline-none focus:border-blue-500"
              >
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="auto">Auto rickshaw</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="vehicleRegistration"
                className="mb-2 block text-sm font-medium"
              >
                Vehicle registration number
              </label>
              <input
                id="vehicleRegistration"
                name="vehicleRegistration"
                value={form.vehicleRegistration}
                onChange={updateField}
                autoCapitalize="characters"
                minLength={3}
                maxLength={30}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3 uppercase outline-none focus:border-blue-500"
                placeholder="Enter registration number"
              />
            </div>

            <div>
              <label
                htmlFor="licenseNumber"
                className="mb-2 block text-sm font-medium"
              >
                Driving licence number
              </label>
              <input
                id="licenseNumber"
                name="licenseNumber"
                value={form.licenseNumber}
                onChange={updateField}
                autoCapitalize="characters"
                minLength={3}
                maxLength={50}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-3 uppercase outline-none focus:border-blue-500"
                placeholder="Enter licence number"
              />
            </div>

            <p className="text-xs leading-5 text-slate-500">
              These details are used for driver application review. Only submit
              information you are authorized to share. This form does not
              verify the authenticity of your documents.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Submitting..."
                : submitted
                  ? "Update pending application"
                  : "Submit driver application"}
            </button>
          </form>
        )}

        {isApproved && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
            <h2 className="font-semibold text-green-800">
              Your driver account is approved
            </h2>
            <Link
              href="/driver/dashboard"
              className="mt-4 inline-block rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
            >
              Open driver dashboard
            </Link>
          </div>
        )}

        <Link
          href="/"
          className="mt-6 block text-center text-sm text-slate-600 hover:text-blue-600"
        >
          Back to CabGo home
        </Link>
      </section>
    </main>
  );
}
