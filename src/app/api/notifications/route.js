
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, booking_id, is_read, created_at")
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return Response.json({ notifications: data });
  } catch (error) {
    console.error("Notifications GET error:", error.message);
    return Response.json(
      { error: "Could not load notifications." },
      { status: 500 }
    );
  }
}

// Mark one of the signed-in user's notifications as read.
export async function PATCH(request) {
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

    if (typeof body.notificationId !== "string" || !body.notificationId) {
      return Response.json(
        { error: "A notification ID is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", body.notificationId)
      .eq("clerk_user_id", userId)
      .select("id, is_read")
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return Response.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return Response.json({ notification: data });
  } catch (error) {
    console.error("Notifications PATCH error:", error.message);
    return Response.json(
      { error: "Could not update notification." },
      { status: 500 }
    );
  }
}

// Internal notification creation must be authenticated and tied to a booking
// owned by the current user. System events should be created by trusted
// server-side booking/payment workflows, not by arbitrary browser requests.
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

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const message =
      typeof body.message === "string" ? body.message.trim() : "";
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId : null;

    if (
      !title ||
      title.length > 120 ||
      !message ||
      message.length > 1000
    ) {
      return Response.json(
        { error: "Enter a title and message within the allowed limits." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id")
        .eq("id", bookingId)
        .eq("clerk_user_id", userId)
        .maybeSingle();

      if (bookingError) throw bookingError;

      if (!booking) {
        return Response.json(
          { error: "Booking not found." },
          { status: 404 }
        );
      }
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        clerk_user_id: userId,
        title,
        message,
        booking_id: bookingId,
      })
      .select("id, title, message, booking_id, is_read, created_at")
      .single();

    if (error) throw error;

    return Response.json({ notification: data }, { status: 201 });
  } catch (error) {
    console.error("Notifications POST error:", error.message);
    return Response.json(
      { error: "Could not create notification." },
      { status: 500 }
    );
  }
}
