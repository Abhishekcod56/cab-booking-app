
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isApprovedDriver } from "@/lib/driver-auth";
import { createNotification } from "@/lib/notifications";

const ALLOWED_TRANSITIONS = {
  requested: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed"],
  completed: [],
  cancelled: [],
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );
}

export async function GET(request, { params }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    const { bookingId } = await params;
    const supabase = getSupabase();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (error) {
      console.error("Fetch booking status error:", error.message);
      return Response.json(
        { error: "Could not fetch booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      return Response.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const isCustomer = booking.clerk_user_id === userId;
    const isAssignedDriver =
      booking.driver_clerk_user_id === userId &&
      (await isApprovedDriver(supabase, userId));

    if (!isCustomer && !isAssignedDriver) {
      return Response.json(
        { error: "You are not allowed to view this booking." },
        { status: 403 }
      );
    }

    return Response.json({
      booking,
      status: booking.status,
    });
  } catch (error) {
    console.error("Get booking status error:", error);

    return Response.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    const { bookingId } = await params;
    const body = await request.json();
    const newStatus = body?.status;

    if (
      typeof newStatus !== "string" ||
      !Object.prototype.hasOwnProperty.call(
        ALLOWED_TRANSITIONS,
        newStatus
      )
    ) {
      return Response.json(
        { error: "Invalid booking status." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Only approved drivers may change ride status.
    const approved = await isApprovedDriver(supabase, userId);

    if (!approved) {
      return Response.json(
        { error: "Only approved drivers can update ride status." },
        { status: 403 }
      );
    }

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchError) {
      console.error("Fetch booking error:", fetchError.message);
      return Response.json(
        { error: "Could not fetch booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      return Response.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    const isAlreadyAssigned =
      booking.driver_clerk_user_id === userId;

    const isUnassignedRequest =
      booking.driver_clerk_user_id == null &&
      booking.status === "requested";

    // A driver may only update their own ride or accept
    // a ride that has not yet been assigned.
    if (!isAlreadyAssigned && !isUnassignedRequest) {
      return Response.json(
        {
          error:
            "This ride is assigned to another driver or is unavailable.",
        },
        { status: 403 }
      );
    }

    // Unassigned rides can only be claimed by accepting them.
    if (isUnassignedRequest && newStatus !== "accepted") {
      return Response.json(
        { error: "Accept the ride before changing its status." },
        { status: 409 }
      );
    }

    const allowedStatuses =
      ALLOWED_TRANSITIONS[booking.status] || [];

    if (!allowedStatuses.includes(newStatus)) {
      return Response.json(
        {
          error: `Cannot change status from ${booking.status} to ${newStatus}.`,
        },
        { status: 400 }
      );
    }

    let updateQuery = supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId)
      .eq("status", booking.status);

    if (isUnassignedRequest) {
      // Claim the ride only if another driver has not
      // already accepted it.
      updateQuery = supabase
        .from("bookings")
        .update({
          status: "accepted",
          driver_clerk_user_id: userId,
        })
        .eq("id", bookingId)
        .eq("status", "requested")
        .is("driver_clerk_user_id", null);
    } else {
      // Assigned drivers can only update their own rides.
      updateQuery = updateQuery.eq(
        "driver_clerk_user_id",
        userId
      );
    }

    const { data: updatedBookings, error: updateError } =
      await updateQuery.select("*");

    if (updateError) {
      console.error("Update booking status error:", updateError.message);
      return Response.json(
        { error: "Could not update booking status." },
        { status: 500 }
      );
    }

    // If no row was updated, the ride may have changed
    // or another driver may have accepted it first.
    if (!updatedBookings || updatedBookings.length === 0) {
      return Response.json(
        {
          error:
            "This ride has changed or was already accepted by another driver. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    const updatedBooking = updatedBookings[0];

    // Notify the customer about the status change.
    const messages = {
      accepted: "Your ride has been accepted by a driver.",
      in_progress: "Your ride is now in progress.",
      completed: "Your ride has been completed.",
      cancelled: "Your ride has been cancelled.",
    };

    await createNotification({
      supabase,
      userId: updatedBooking.clerk_user_id,
      title: "Ride status updated",
      message: messages[newStatus],
      bookingId: updatedBooking.id,
    });

    return Response.json({
      message: "Booking status updated successfully.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    return Response.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
