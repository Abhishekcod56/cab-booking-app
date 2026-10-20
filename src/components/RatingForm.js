
"use client";

import { useState } from "react";

export default function RatingForm({ bookingId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not submit your review.");
        return;
      }

      setMessage("Thank you! Your review was submitted.");
      setComment("");

      if (onSubmitted) {
        onSubmitted(data.review);
      }
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-4 rounded-xl border bg-white p-4"
    >
      <h3 className="font-bold">Rate your ride</h3>

      <div>
        <p className="mb-2 text-sm text-gray-600">
          Choose your rating
        </p>

        <div className="flex gap-2" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              className={`text-3xl ${
                star <= rating ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor={`review-comment-${bookingId}`}
          className="block text-sm font-semibold"
        >
          Comment (optional)
        </label>

        <textarea
          id={`review-comment-${bookingId}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="How was your ride?"
          className="mt-2 w-full rounded-lg border p-3"
        />
      </div>

      {message && (
        <p role="status" className="text-sm text-gray-700">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-yellow-400 px-5 py-2 font-bold hover:bg-yellow-500 disabled:opacity-50"
      >
        {saving ? "Submitting..." : "Submit review"}
      </button>
    </form>
  );
}
