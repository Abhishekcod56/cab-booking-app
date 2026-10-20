
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";
import { createNotification } from "@/lib/notifications";
export const dynamic = "force-dynamic";


function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key);
}

export async function POST(request, context) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin(userId)) {
      return Response.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const { bookingId } = await context.params;

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { driverClerkUserId } = body;

    if (
      typeof driverClerkUserId !== "string" ||
      !driverClerkUserId.startsWith("user_")
    ) {
      return Response.json(
        { error: "A valid driver user ID is required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: driver, error: driverError } = await supabase
      .from("driver_profiles")
      .select("clerk_user_id, is_approved")
      .eq("clerk_user_id", driverClerkUserId)
      .maybeSingle();

    if (driverError) {
      console.error("Driver lookup failed:", driverError.message);
      return Response.json(
        { error: "Could not verify driver." },
        { status: 500 }
      );
    }

    if (!driver || !driver.is_approved) {
      return Response.json(
        { error: "Only approved drivers can be assigned." },
        { status: 400 }
      );
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, clerk_user_id, pickup, destination, status, driver_clerk_user_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("Booking lookup failed:", bookingError.message);
      return Response.json(
        { error: "Could not load booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      return Response.json({ error: "Ride not found." }, { status: 404 });
    }

    if (booking.status !== "requested" || booking.driver_clerk_user_id) {
      return Response.json(
        {
          error:
            "Only unassigned rides with requested status can be assigned.",
        },
        { status: 409 }
      );
    }

    // Conditional update prevents two admins from assigning the same ride.
    const { data: assignedBooking, error: assignError } = await supabase
      .from("bookings")
      .update({ driver_clerk_user_id: driverClerkUserId })
      .eq("id", bookingId)
      .eq("status", "requested")
      .is("driver_clerk_user_id", null)
      .select("id, clerk_user_id, pickup, destination, status, driver_clerk_user_id")
      .maybeSingle();

    if (assignError) {
      console.error("Ride assignment failed:", assignError.message);
      return Response.json(
        { error: "Could not assign this ride." },
        { status: 500 }
      );
    }

    if (!assignedBooking) {
      return Response.json(
        {
          error:
            "This ride may have been assigned already. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    await Promise.all([
      createNotification({
        supabase,
        userId: assignedBooking.clerk_user_id,
        title: "Driver assigned to your ride",
        message: "A driver has been assigned to your CabGo ride.",
        bookingId: assignedBooking.id,
      }),
      createNotification({
        supabase,
        userId: driverClerkUserId,
        title: "New ride assigned",
        message: `A ride from ${assignedBooking.pickup} to ${assignedBooking.destination} has been assigned to you.`,
        bookingId: assignedBooking.id,
      }),
    ]);

    return Response.json({
      success: true,
      booking: assignedBooking,
      message: "Driver assigned successfully.",
    });
  } catch (error) {
    console.error("Ride assignment API error:", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
