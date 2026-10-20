
import Link from "next/link";

export default function DriverPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-3xl">
          🛡️
        </div>

        <h1 className="mt-6 text-2xl font-extrabold">
          Driver access unavailable
        </h1>

        <p className="mt-4 leading-7 text-slate-300">
          Your driver account has not been approved yet, or we could not
          verify your access. Once your account is approved, you can use
          the driver dashboard.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
          >
            Back to sign in
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold hover:bg-slate-800"
          >
            Go to booking
          </Link>
        </div>
      </section>
    </main>
  );
}
