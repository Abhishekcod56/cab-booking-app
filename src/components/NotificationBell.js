
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/notifications", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          const unread = (data.notifications || []).filter(
            (item) => !item.is_read
          ).length;

          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Could not load notification count:", error);
      }
    }

    loadUnreadCount();

    const intervalId = setInterval(loadUnreadCount, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-gray-100"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} unread notifications`
          : "Notifications"
      }
    >
      <span aria-hidden="true">🔔</span>
      <span className="hidden sm:inline">Notifications</span>

      {unreadCount > 0 && (
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
