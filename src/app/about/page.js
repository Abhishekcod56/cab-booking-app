
import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b bg-white px-6 py-5">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-yellow-500">Cab</span>Go
        </Link>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <p className="font-bold uppercase tracking-widest text-yellow-600">
          About CabGo
        </p>

        <h1 className="mt-3 text-4xl font-extrabold">
          Your journey, made simpler.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          CabGo is a cab-booking platform designed to make planning
          rides simple. Enter your pickup and destination, check
          your estimated fare, request a ride, and manage your
          bookings from one place.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Simple booking",
              text: "Enter your locations and request a ride.",
            },
            {
              title: "Clear fares",
              text: "See the calculated fare before confirming.",
            },
            {
              title: "Ride updates",
              text: "View your booking status and available tracking.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border bg-white p-6 shadow-sm"
            >
              <h2 className="font-bold">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {item.text}
              </p>
            </article>
          ))}
        </div>

        <Link
          href="/#book"
          className="mt-10 inline-block rounded-xl bg-yellow-400 px-6 py-3 font-bold hover:bg-yellow-500"
        >
          Book a ride
        </Link>
      </section>
    </main>
  );
}
