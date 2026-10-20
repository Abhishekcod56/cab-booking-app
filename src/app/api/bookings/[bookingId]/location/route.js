
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isApprovedDriver } from "@/lib/driver-auth";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

function serverError(error) {
  console.error("Ride location API error:", error);

  return Response.json(
    { error: "An internal server error occurred." },
    { status: 500 }
  );
}

// GET: The rider or assigned, approved driver can view the ride.
export async function GET(request, context) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { bookingId } = await context.params;
    const supabase = getSupabase();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        [
          "id",
          "clerk_user_id",
          "driver_clerk_user_id",
          "pickup",
          "destination",
          "pickup_latitude",
          "pickup_longitude",
          "destination_latitude",
          "destination_longitude",
          "status",
        ].join(", ")
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      return serverError(bookingError);
    }

    if (!booking) {
      return Response.json(
        { error: "Ride not found." },
        { status: 404 }
      );
    }

    const isRider = booking.clerk_user_id === userId;
    const isAssignedDriver =
      booking.driver_clerk_user_id === userId;

    if (!isRider && !isAssignedDriver) {
      return Response.json(
        { error: "Forbidden." },
        { status: 403 }
      );
    }

    if (isAssignedDriver) {
      const approved = await isApprovedDriver(
        supabase,
        userId
      );

      if (!approved) {
        return Response.json(
          { error: "Your driver account is not approved." },
          { status: 403 }
        );
      }
    }

    const { data: location, error: locationError } =
      await supabase
        .from("ride_locations")
        .select(
          "booking_id, latitude, longitude, updated_at"
        )
        .eq("booking_id", bookingId)
        .maybeSingle();

    if (locationError) {
      return serverError(locationError);
    }

    return Response.json({
      booking: {
        id: booking.id,
        pickup: booking.pickup,
        destination: booking.destination,

        pickup_latitude: booking.pickup_latitude,
        pickup_longitude: booking.pickup_longitude,
        destination_latitude:
          booking.destination_latitude,
        destination_longitude:
          booking.destination_longitude,

        status: booking.status,
      },
      bookingId: booking.id,
      status: booking.status,
      location: location ?? null,
    });
  } catch (error) {
    return serverError(error);
  }
}

// POST: Only the assigned, approved driver can share a location.
// The ride must already be in progress.
export async function POST(request, context) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { bookingId } = await context.params;
    const supabase = getSupabase();

    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .select("id, driver_clerk_user_id, status")
        .eq("id", bookingId)
        .maybeSingle();

    if (bookingError) {
      return serverError(bookingError);
    }

    if (!booking) {
      return Response.json(
        { error: "Ride not found." },
        { status: 404 }
      );
    }

    if (booking.driver_clerk_user_id !== userId) {
      return Response.json(
        {
          error:
            "Only the assigned driver can share this location.",
        },
        { status: 403 }
      );
    }

    const approved = await isApprovedDriver(
      supabase,
      userId
    );

    if (!approved) {
      return Response.json(
        { error: "Your driver account is not approved." },
        { status: 403 }
      );
    }

    if (booking.status !== "in_progress") {
      return Response.json(
        {
          error:
            "Location sharing is only allowed during an active ride.",
        },
        { status: 409 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { latitude, longitude } = body;

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return Response.json(
        {
          error:
            "Valid latitude and longitude are required.",
        },
        { status: 400 }
      );
    }

    const { data: location, error: upsertError } =
      await supabase
        .from("ride_locations")
        .upsert(
          {
            booking_id: bookingId,
            latitude,
            longitude,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "booking_id" }
        )
        .select(
          "booking_id, latitude, longitude, updated_at"
        )
        .single();

    if (upsertError) {
      return serverError(upsertError);
    }

    return Response.json({
      success: true,
      location,
    });
  } catch (error) {
    return serverError(error);
  }
}
