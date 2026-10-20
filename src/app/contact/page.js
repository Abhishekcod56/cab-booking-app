"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setNotice("");
    setIsSuccess(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setNotice("Please complete all fields.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          message: trimmedMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Could not send your message. Please try again."
        );
      }

      setIsSuccess(true);
      setNotice(
        result.message || "Your message has been saved successfully."
      );

      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setIsSuccess(false);
      setNotice(
        error.message ||
          "Unable to save your message. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <nav className="border-b bg-white px-6 py-5">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-yellow-500">Cab</span>Go
        </Link>
      </nav>

      <section className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-extrabold">Contact CabGo</h1>

        <p className="mt-3 text-gray-600">
          Have a question about a booking or payment? Send us a message.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5 rounded-2xl border bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="contact-name" className="block font-semibold">
              Your name
            </label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg border p-3 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="block font-semibold">
              Email address
            </label>
            <input
              id="contact-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg border p-3 disabled:opacity-60"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="block font-semibold">
              Message
            </label>
            <textarea
              id="contact-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={3000}
              required
              rows={5}
              disabled={isSubmitting}
              className="mt-2 w-full rounded-lg border p-3 disabled:opacity-60"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {message.length}/3000 characters
            </p>
          </div>

          {notice && (
            <p
              role="status"
              aria-live="polite"
              className={`rounded-lg p-3 text-sm ${
                isSuccess
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-yellow-400 px-5 py-3 font-bold hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending message..." : "Send message"}
          </button>
        </form>
      </section>
    </main>
  );
}