
"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [role, setRole] = useState("");
  const { isLoaded, isSignedIn } = useUser();

  const destination =
    role === "driver"
      ? "/auth/continue?role=driver"
      : "/auth/continue?role=rider";

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading CabGo...
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl md:grid md:grid-cols-2">
        <section className="flex flex-col justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-8 md:p-12">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-blue-700">
              C
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">CabGo</h1>
              <p className="text-sm text-blue-100">Your ride, your way.</p>
            </div>
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">
            Welcome to CabGo
          </p>

          <h2 className="text-4xl font-extrabold leading-tight md:text-5xl">
            Where would you like to go?
          </h2>

          <p className="mt-5 max-w-md leading-7 text-blue-100">
            Book a comfortable ride or sign in to manage your driving work.
            Choose your account type to continue.
          </p>

          <div className="mt-10 hidden space-y-4 md:block">
            <p className="text-sm text-blue-100">
              ✓ Simple booking
            </p>
            <p className="text-sm text-blue-100">
              ✓ Secure sign-in
            </p>
            <p className="text-sm text-blue-100">
              ✓ Verified driver access
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-10 md:p-12">
          <h2 className="text-2xl font-bold">Sign in to continue</h2>
          <p className="mt-2 text-sm text-slate-400">
            First, choose how you want to use CabGo.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("rider")}
              className={`rounded-2xl border p-4 text-left transition ${
                role === "rider"
                  ? "border-blue-400 bg-blue-500/15 ring-2 ring-blue-400"
                  : "border-slate-700 bg-slate-800 hover:border-slate-500"
              }`}
            >
              <span className="text-3xl">🚕</span>
              <span className="mt-3 block font-bold">Rider</span>
              <span className="mt-1 block text-xs text-slate-400">
                Book a ride
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRole("driver")}
              className={`rounded-2xl border p-4 text-left transition ${
                role === "driver"
                  ? "border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400"
                  : "border-slate-700 bg-slate-800 hover:border-slate-500"
              }`}
            >
              <span className="text-3xl">🚗</span>
              <span className="mt-3 block font-bold">Driver</span>
              <span className="mt-1 block text-xs text-slate-400">
                Driver dashboard
              </span>
            </button>
          </div>

          {!role && (
            <p className="mt-5 rounded-xl bg-slate-800 p-3 text-sm text-slate-300">
              Select Rider or Driver to continue.
            </p>
          )}

          {role && !isSignedIn && (
            <div className="mt-7">
              <p className="mb-4 text-sm text-slate-300">
                Selected account:{" "}
                <span className="font-bold capitalize text-white">
                  {role}
                </span>
              </p>

              <SignIn
                key={role}
                routing="hash"
                forceRedirectUrl={destination}
                signUpUrl={`/sign-up?role=${role}`}
              />
            </div>
          )}

          {role && isSignedIn && (
            <div className="mt-7">
              <p className="mb-4 text-sm text-slate-300">
                You are already signed in. Continue as {role}.
              </p>
              <Link
                href={destination}
                className="block rounded-xl bg-blue-600 px-5 py-3 text-center font-bold transition hover:bg-blue-500"
              >
                Continue as {role === "rider" ? "Rider" : "Driver"}
              </Link>
            </div>
          )}

          <p className="mt-7 text-center text-xs leading-5 text-slate-500">
            Driver access is available only to approved drivers.
            Selecting Driver does not grant approval.
          </p>
        </section>
      </div>
    </main>
  );
}
