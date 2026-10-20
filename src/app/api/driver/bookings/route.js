
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getApprovedDriver(supabase, userId) {
  const { data, error } = await supabase
    .from("drivers")
    .select("clerk_user_id")
    .eq("clerk_user_id", userId)
    .eq("approved", true)
    .maybeSingle();

  if (error) {
    throw new Error("Could not verify driver approval.");
  }

  return data;
}

// GET: List available rides and this driver's assigned rides
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    const supabase = getSupabase();
    const driver = await getApprovedDriver(supabase, userId);

    if (!driver) {
      return Response.json(
        { error: "Your account is not approved as a driver." },
        { status: 403 }
      );
    }

    const columns =
      "id, pickup, destination, status, created_at, driver_clerk_user_id";

    const [availableResult, assignedResult] = await Promise.all([
      supabase
        .from("bookings")
        .select(columns)
        .eq("status", "requested")
        .is("driver_clerk_user_id", null)
        .order("created_at", { ascending: true }),

      supabase
        .from("bookings")
        .select(columns)
        .eq("driver_clerk_user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (availableResult.error || assignedResult.error) {
      console.error(
        "Driver bookings error:",
        availableResult.error?.message || assignedResult.error?.message
      );

      return Response.json(
        { error: "Could not load rides." },
        { status: 500 }
      );
    }

    return Response.json({
      availableRides: availableResult.data,
      assignedRides: assignedResult.data,
    });
  } catch (error) {
    console.error("Driver GET error:", error.message);

    return Response.json(
      { error: "Something went wrong while loading rides." },
      { status: 500 }
    );
  }
}

// PATCH: Accept a ride or update its progress
export async function PATCH(request) {
  try {
  const { userId } = await auth();

console.log("CabGo PATCH auth debug:", {
  signedIn: Boolean(userId),
  cookiePresent: Boolean(request.headers.get("cookie")),
  authorizationPresent: Boolean(
    request.headers.get("authorization")
  ),
});

if (!userId) {
  return Response.json(
    { error: "Please sign in." },
    { status: 401 }
  );
}
    const body = await request.json();
    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId : "";
    const action =
      typeof body.action === "string" ? body.action : "";

    if (!bookingId || !["accept", "start", "complete"].includes(action)) {
      return Response.json(
        { error: "A valid bookingId and action are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const driver = await getApprovedDriver(supabase, userId);

    if (!driver) {
      return Response.json(
        { error: "Your account is not approved as a driver." },
        { status: 403 }
      );
    }

    let query;

    if (action === "accept") {
      // Claim only an unassigned, requested ride.
      // The conditions prevent two drivers from claiming it.
      query = supabase
        .from("bookings")
        .update({
          driver_clerk_user_id: userId,
          status: "accepted",
        })
        .eq("id", bookingId)
        .eq("status", "requested")
        .is("driver_clerk_user_id", null);
    } else if (action === "start") {
      query = supabase
        .from("bookings")
        .update({ status: "in_progress" })
        .eq("id", bookingId)
        .eq("driver_clerk_user_id", userId)
        .eq("status", "accepted");
    } else {
      query = supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", bookingId)
        .eq("driver_clerk_user_id", userId)
        .eq("status", "in_progress");
    }

    const { data, error } = await query
      .select("id, pickup, destination, status, created_at")
      .maybeSingle();

    if (error) {
      console.error("Ride update error:", error.message);

      return Response.json(
        { error: "Could not update this ride." },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        {
          error:
            "This ride is no longer available or its status has changed. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    return Response.json({
      message:
        action === "accept"
          ? "Ride accepted successfully."
          : action === "start"
            ? "Ride started successfully."
            : "Ride completed successfully.",
      booking: data,
    });
  } catch (error) {
    console.error("Driver PATCH error:", error.message);

    return Response.json(
      { error: "Something went wrong while updating the ride." },
      { status: 500 }
    );
  }
}
