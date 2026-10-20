
"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminRidesPage() {
  const [rides, setRides] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [assigningRideId, setAssigningRideId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [ridesResponse, driversResponse] = await Promise.all([
        fetch("/api/admin/bookings", { cache: "no-store" }),
        fetch("/api/admin/drivers", { cache: "no-store" }),
      ]);

      const ridesResult = await ridesResponse.json();
      const driversResult = await driversResponse.json();

      if (!ridesResponse.ok) {
        throw new Error(
          ridesResult.error || "Could not load unassigned rides."
        );
      }

      if (!driversResponse.ok) {
        throw new Error(
          driversResult.error || "Could not load driver information."
        );
      }

      setRides(ridesResult.bookings || []);
      setDrivers(
        (driversResult.drivers || []).filter(
          (driver) => driver.is_approved === true
        )
      );
    } catch (err) {
      setError(err.message || "Could not load admin data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function assignDriver(rideId) {
    const driverClerkUserId = assignments[rideId];

    if (!driverClerkUserId) {
      setError("Please select an approved driver first.");
      return;
    }

    setAssigningRideId(rideId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/bookings/${rideId}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ driverClerkUserId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not assign this ride.");
      }

      setMessage("Driver assigned successfully.");
      setAssignments((previous) => {
        const updated = { ...previous };
        delete updated[rideId];
        return updated;
      });

      await loadData();
    } catch (err) {
      setError(err.message || "Ride assignment failed.");
    } finally {
      setAssigningRideId(null);
    }
  }

  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));

  const date = (value) =>
    value ? new Date(value).toLocaleString("en-IN") : "—";

  const styles = {
    page: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: 24,
      color: "#171717",
    },
    button: {
      padding: "10px 14px",
      borderRadius: 8,
      border: "1px solid #ddd",
      cursor: "pointer",
      background: "#fff",
    },
    input: {
      width: "100%",
      padding: 10,
      border: "1px solid #ccc",
      borderRadius: 8,
      background: "#fff",
    },
    card: {
      border: "1px solid #e5e5e5",
      borderRadius: 12,
      padding: 18,
      marginTop: 16,
    },
    link: {
      color: "#2563eb",
      textDecoration: "underline",
    },
  };

  return (
    <main style={styles.page}>
      <h1 style={{ fontSize: 30, fontWeight: 750 }}>
        Admin Ride Assignment
      </h1>

      <p style={{ color: "#666", marginTop: 8 }}>
        Assign requested rides to approved CabGo drivers.
      </p>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          marginTop: 20,
          marginBottom: 24,
        }}
      >
        <a href="/admin/all-rides" style={styles.link}>
          View all ride history →
        </a>

        <a href="/admin/drivers" style={styles.link}>
          Manage driver applications →
        </a>
      </nav>

      <div style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          style={styles.button}
        >
          {loading ? "Refreshing..." : "Refresh rides"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={styles.card}>
          <p style={{ color: "#666" }}>Unassigned rides</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{rides.length}</p>
        </div>

        <div style={styles.card}>
          <p style={{ color: "#666" }}>Approved drivers</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>{drivers.length}</p>
        </div>
      </section>

      {loading && <p>Loading rides and drivers...</p>}

      {!loading && !error && rides.length === 0 && (
        <div style={styles.card}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            No unassigned rides
          </h2>
          <p style={{ color: "#666", marginTop: 8 }}>
            New ride requests will appear here when they are available
            for driver assignment.
          </p>
        </div>
      )}

      {!loading &&
        rides.map((ride) => (
          <article key={ride.id} style={styles.card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>
                Ride request
              </h2>

              <span
                style={{
                  background: "#fff3cd",
                  padding: "5px 10px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                  height: "fit-content",
                }}
              >
                {ride.status}
              </span>
            </div>

            <p style={{ marginTop: 12, overflowWrap: "anywhere" }}>
              <strong>Ride ID:</strong> {ride.id}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Pickup:</strong> {ride.pickup}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Destination:</strong> {ride.destination}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Rider ID:</strong> {ride.clerk_user_id}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Distance:</strong>{" "}
              {ride.distance_km == null
                ? "Not available"
                : `${ride.distance_km} km`}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Estimated fare:</strong> {money(ride.fare_amount)}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Requested:</strong> {date(ride.created_at)}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
                alignItems: "center",
              }}
            >
              <select
                aria-label={`Select driver for ride ${ride.id}`}
                value={assignments[ride.id] || ""}
                onChange={(event) =>
                  setAssignments((previous) => ({
                    ...previous,
                    [ride.id]: event.target.value,
                  }))
                }
                disabled={drivers.length === 0 || assigningRideId === ride.id}
                style={{
                  ...styles.input,
                  flex: "1 1 260px",
                  width: "auto",
                }}
              >
                <option value="">Select an approved driver</option>

                {drivers.map((driver) => (
                  <option
                    key={driver.clerk_user_id}
                    value={driver.clerk_user_id}
                  >
                    {(driver.full_name || "Driver") +
                      " — " +
                      driver.clerk_user_id}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => assignDriver(ride.id)}
                disabled={
                  !assignments[ride.id] ||
                  assigningRideId === ride.id ||
                  drivers.length === 0
                }
                style={{
                  ...styles.button,
                  background:
                    !assignments[ride.id] || assigningRideId === ride.id
                      ? "#e5e5e5"
                      : "#171717",
                  color:
                    !assignments[ride.id] || assigningRideId === ride.id
                      ? "#666"
                      : "#fff",
                }}
              >
                {assigningRideId === ride.id
                  ? "Assigning..."
                  : "Assign driver"}
              </button>
            </div>

            {drivers.length === 0 && (
              <p style={{ color: "#b45309", marginTop: 12 }}>
                No approved drivers are available. Approve a driver
                from the driver management page first.
              </p>
            )}
          </article>
        ))}
    </main>
  );
}
