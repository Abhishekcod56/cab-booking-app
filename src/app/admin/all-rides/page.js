
"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminAllRidesPage() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookings() {
    try {
      setError("");

      const response = await fetch("/api/admin/all-bookings", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load rides.");
      }

      setBookings(result.bookings || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((ride) => {
      const matchesStatus =
        filter === "all" || ride.status === filter;

      const matchesSearch =
        !query ||
        [
          ride.id,
          ride.clerk_user_id,
          ride.driver_clerk_user_id,
          ride.pickup,
          ride.destination,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );

      return matchesStatus && matchesSearch;
    });
  }, [bookings, filter, search]);

  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const date = (value) =>
    value ? new Date(value).toLocaleString("en-IN") : "—";

  const statusStyle = (status) => {
    const colors = {
      requested: "#fff3cd",
      accepted: "#cfe2ff",
      in_progress: "#d1e7dd",
      completed: "#d1e7dd",
      cancelled: "#f8d7da",
    };

    return {
      display: "inline-block",
      padding: "4px 9px",
      borderRadius: 20,
      background: colors[status] || "#eee",
      fontSize: 12,
      fontWeight: 600,
    };
  };

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: 24,
        color: "#171717",
      }}
    >
      <h1 style={{ fontSize: 30, fontWeight: 750 }}>
        All Rides
      </h1>

      <p style={{ color: "#666", marginTop: 6 }}>
        Admin overview of CabGo ride requests, assignments,
        fares and payment statuses.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          margin: "24px 0",
        }}
      >
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ride, rider, driver or location"
          style={{
            flex: "1 1 280px",
            minWidth: 0,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={{
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <option value="all">All statuses</option>
          <option value="requested">Requested</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          onClick={loadBookings}
          style={{
            padding: "12px 18px",
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          ["Total rides", bookings.length],
          [
            "Active rides",
            bookings.filter((ride) =>
              ["requested", "accepted", "in_progress"].includes(
                ride.status
              )
            ).length,
          ],
          [
            "Completed",
            bookings.filter((ride) => ride.status === "completed")
              .length,
          ],
          [
            "Paid rides",
            bookings.filter((ride) => ride.payment_status === "paid")
              .length,
          ],
        ].map(([label, value]) => (
          <section
            key={label}
            style={{
              border: "1px solid #e5e5e5",
              borderRadius: 10,
              padding: 16,
            }}
          >
            <p style={{ color: "#666", fontSize: 13 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 700 }}>{value}</p>
          </section>
        ))}
      </div>

      {loading && <p>Loading rides...</p>}

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#fee2e2",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filteredBookings.length === 0 && (
        <p>No rides match your search.</p>
      )}

      {!loading && filteredBookings.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 950,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                {[
                  "Ride",
                  "Route",
                  "Status",
                  "Distance",
                  "Fare",
                  "Payment",
                  "Driver",
                  "Created",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredBookings.map((ride) => (
                <tr key={ride.id}>
                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #eee",
                      maxWidth: 150,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {ride.id}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #eee",
                      maxWidth: 250,
                    }}
                  >
                    <div>
                      <strong>From:</strong> {ride.pickup}
                    </div>
                    <div style={{ marginTop: 5 }}>
                      <strong>To:</strong> {ride.destination}
                    </div>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    <span style={statusStyle(ride.status)}>
                      {ride.status.replace("_", " ")}
                    </span>
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {ride.distance_km == null
                      ? "—"
                      : `${ride.distance_km} km`}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {money(ride.fare_amount)}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {ride.payment_status || "unpaid"}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      borderBottom: "1px solid #eee",
                      maxWidth: 150,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {ride.driver_clerk_user_id || "Unassigned"}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {date(ride.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: "#666", fontSize: 12, marginTop: 16 }}>
        Showing up to 200 most recent rides. Rider and driver IDs are
        Clerk IDs, not names.
      </p>
    </main>
  );
}
