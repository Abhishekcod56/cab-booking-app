
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const supabase = getSupabase();

    let query = supabase
      .from("reviews")
      .select("id, booking_id, rating, comment, created_at")
      .eq("rider_clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (bookingId) {
      query = query.eq("booking_id", bookingId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({ reviews: data });
  } catch (error) {
    console.error("Reviews GET error:", error.message);
    return Response.json(
      { error: "Could not load reviews." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId : "";
    const rating = body.rating;
    const comment =
      typeof body.comment === "string" ? body.comment.trim() : "";

    if (
      !bookingId ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      comment.length > 1000
    ) {
      return Response.json(
        { error: "Enter a valid booking, rating, and comment." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, clerk_user_id, status")
      .eq("id", bookingId)
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (bookingError) throw bookingError;

    if (!booking) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }

    if (booking.status !== "completed") {
      return Response.json(
        { error: "You can review a ride only after it is completed." },
        { status: 409 }
      );
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        booking_id: bookingId,
        rider_clerk_user_id: userId,
        rating,
        comment,
      })
      .select("id, booking_id, rating, comment, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "You have already reviewed this ride." },
          { status: 409 }
        );
      }

      throw error;
    }

    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Reviews POST error:", error.message);
    return Response.json(
      { error: "Could not submit your review." },
      { status: 500 }
    );
  }
}
