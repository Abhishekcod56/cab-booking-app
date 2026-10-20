
"use client";

import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between border-b bg-white px-6 py-5">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-yellow-500">Cab</span>Go
        </Link>

        <Link
          href="/my-bookings"
          className="font-semibold hover:text-yellow-600"
        >
          My Bookings
        </Link>
      </nav>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">
          Account Management
        </h1>

        <p className="mt-2 text-gray-600">
          Update your personal information and manage your account security.
        </p>

        <div className="mt-8 flex justify-center">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: "w-full max-w-4xl",
                card: "w-full shadow-sm",
              },
            }}
          />
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/my-bookings"
            className="inline-block rounded-xl bg-yellow-400 px-5 py-3 font-bold hover:bg-yellow-500"
          >
            View My Bookings
          </Link>
        </div>
      </section>
    </main>
  );
}
