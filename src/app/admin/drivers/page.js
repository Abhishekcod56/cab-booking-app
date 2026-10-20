
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/drivers", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load applications.");
      }

      setDrivers(result.drivers || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  async function updateApproval(driverClerkUserId, isApproved) {
    const action = isApproved ? "approve" : "revoke approval for";

    if (!window.confirm(`Are you sure you want to ${action} this driver?`)) {
      return;
    }

    setUpdatingId(driverClerkUserId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/drivers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverClerkUserId, isApproved }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update driver.");
      }

      setMessage(
        isApproved
          ? "Driver approved successfully."
          : "Driver approval revoked."
      );

      await loadDrivers();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "pending") return !driver.is_approved;
    if (filter === "approved") return driver.is_approved;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              CabGo Management
            </p>
            <h1 className="mt-2 text-3xl font-bold">Driver applications</h1>
            <p className="mt-2 text-slate-600">
              Review driver details before approving applications.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/rides"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Assign rides
            </Link>

            <button
              onClick={loadDrivers}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800"
          >
            {message}
          </div>
        )}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total applications</p>
            <p className="mt-2 text-3xl font-bold">{drivers.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pending approval</p>
            <p className="mt-2 text-3xl font-bold">
              {drivers.filter((driver) => !driver.is_approved).length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Approved drivers</p>
            <p className="mt-2 text-3xl font-bold">
              {drivers.filter((driver) => driver.is_approved).length}
            </p>
          </div>
        </section>

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "all", label: "All applications" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                filter === option.value
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {loading ? (
            <p className="py-8 text-slate-500">Loading applications...</p>
          ) : filteredDrivers.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-6 text-slate-600">
              No applications found in this category.
            </div>
          ) : (
            <div className="space-y-5">
              {filteredDrivers.map((driver) => {
                const isUpdating = updatingId === driver.clerk_user_id;

                return (
                  <article
                    key={driver.clerk_user_id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold">
                          {driver.full_name || "Name not provided"}
                        </h2>
                        <p className="mt-1 break-all text-sm text-slate-500">
                          Clerk ID: {driver.clerk_user_id}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Applied:{" "}
                          {driver.created_at
                            ? new Date(driver.created_at).toLocaleString()
                            : "Date unavailable"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          driver.is_approved
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {driver.is_approved ? "Approved" : "Pending"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Detail label="Phone" value={driver.phone} />
                      <Detail label="Vehicle type" value={driver.vehicle_type} />
                      <Detail
                        label="Vehicle registration"
                        value={driver.vehicle_registration}
                      />
                      <Detail
                        label="Driving licence number"
                        value={driver.license_number}
                      />
                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <button
                        onClick={() =>
                          updateApproval(
                            driver.clerk_user_id,
                            !driver.is_approved
                          )
                        }
                        disabled={isUpdating}
                        className={`rounded-lg px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                          driver.is_approved
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {isUpdating
                          ? "Updating..."
                          : driver.is_approved
                            ? "Revoke approval"
                            : "Approve driver"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Application details include personal information. Only authorized
          administrators should access this page. Verify driver identity and
          documents through your approved verification process before granting
          access.
        </p>
      </div>
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 wrap-break-word font-medium">
        {value || "Not provided"}
      </p>
    </div>
  );
}
