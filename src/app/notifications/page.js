
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("Loading notifications...");

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not load notifications.");
        return;
      }

      setNotifications(data.notifications || []);
      setMessage(
        data.notifications?.length
          ? ""
          : "You don't have any notifications yet."
      );
    } catch {
      setMessage("Network error. Please try again.");
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  async function markAsRead(notificationId) {
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not update notification.");
        return;
      }

      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, is_read: true }
            : item
        )
      );

      setMessage("");
    } catch {
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="flex items-center justify-between border-b bg-white px-6 py-5">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-yellow-500">Cab</span>Go
        </Link>

        <Link href="/my-bookings" className="font-semibold hover:text-yellow-600">
          My Bookings
        </Link>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-extrabold">Notifications</h1>
        <p className="mt-2 text-gray-600">
          Booking updates and account alerts.
        </p>

        {message && (
          <p className="mt-6 rounded-xl bg-white p-5 text-gray-600" role="status">
            {message}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {notifications.map((item) => (
            <article
              key={item.id}
              className={`rounded-xl border bg-white p-5 ${
                item.is_read ? "border-gray-200" : "border-yellow-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="font-bold">{item.title}</h2>

                {!item.is_read && (
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-800">
                    New
                  </span>
                )}
              </div>

              <p className="mt-2 text-gray-600">{item.message}</p>

              <p className="mt-3 text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString("en-IN")}
              </p>

              <div className="mt-4 flex flex-wrap gap-4">
                {item.booking_id && (
                  <Link
                    href={`/my-bookings`}
                    className="text-sm font-semibold text-blue-700 underline"
                  >
                    View booking
                  </Link>
                )}

                {!item.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="text-sm font-semibold text-gray-700 underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
