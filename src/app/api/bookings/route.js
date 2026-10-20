
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { calculateFare } from "@/lib/fare";
import { createNotification } from "@/lib/notifications";

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

function isValidCoordinates(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    Number.isFinite(Number(value.latitude)) &&
    Number.isFinite(Number(value.longitude)) &&
    Number(value.latitude) >= -90 &&
    Number(value.latitude) <= 90 &&
    Number(value.longitude) >= -180 &&
    Number(value.longitude) <= 180
  );
}

function coordinatesAreSame(first, second) {
  return (
    isValidCoordinates(first) &&
    isValidCoordinates(second) &&
    Number(first.latitude) === Number(second.latitude) &&
    Number(first.longitude) === Number(second.longitude)
  );
}

// GET: Retrieve only the signed-in customer's bookings.
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in to view your bookings." },
        { status: 401 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, pickup, destination, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, status, created_at, distance_km, fare_amount, payment_status"
      )
      .eq("clerk_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load bookings:", error.message);

      return Response.json(
        { error: "Could not load your bookings." },
        { status: 500 }
      );
    }

    return Response.json({ bookings: data });
  } catch (error) {
    console.error("Bookings GET error:", error.message);

    return Response.json(
      { error: "Something went wrong while loading bookings." },
      { status: 500 }
    );
  }
}

// POST: Calculate the fare and create a ride request.
export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "Please sign in to request a ride." },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid request. Please try again." },
        { status: 400 }
      );
    }

    const pickup =
      typeof body?.pickup === "string" ? body.pickup.trim() : "";

    const destination =
      typeof body?.destination === "string"
        ? body.destination.trim()
        : "";

    const pickupCoordinates = isValidCoordinates(body?.pickupCoordinates)
      ? {
          latitude: Number(body.pickupCoordinates.latitude),
          longitude: Number(body.pickupCoordinates.longitude),
        }
      : null;

    const destinationCoordinates = isValidCoordinates(
      body?.destinationCoordinates
    )
      ? {
          latitude: Number(body.destinationCoordinates.latitude),
          longitude: Number(body.destinationCoordinates.longitude),
        }
      : null;

    if (
      !pickup ||
      !destination ||
      pickup.length > 200 ||
      destination.length > 200
    ) {
      return Response.json(
        {
          error:
            "Enter both locations, with no more than 200 characters each.",
        },
        { status: 400 }
      );
    }

    if (
      pickup.toLowerCase() === destination.toLowerCase() ||
      coordinatesAreSame(pickupCoordinates, destinationCoordinates)
    ) {
      return Response.json(
        { error: "Pickup and destination must be different." },
        { status: 400 }
      );
    }

    // Calculate the fare on the server using coordinates when available.
    let fare;

    try {
      fare = await calculateFare(
        pickupCoordinates || pickup,
        destinationCoordinates || destination
      );
    } catch (error) {
      console.error("Fare calculation failed:", error.message);

      return Response.json(
        {
          error:
            "We couldn't calculate a driving route for those locations. Please check them and try again.",
        },
        { status: 422 }
      );
    }

    // Prefer the coordinates returned by the fare calculator.
    const finalPickupCoordinates =
      isValidCoordinates(fare.pickupCoordinates)
        ? fare.pickupCoordinates
        : pickupCoordinates;

    const finalDestinationCoordinates =
      isValidCoordinates(fare.destinationCoordinates)
        ? fare.destinationCoordinates
        : destinationCoordinates;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        clerk_user_id: userId,
        pickup,
        destination,

        pickup_latitude: finalPickupCoordinates?.latitude ?? null,
        pickup_longitude: finalPickupCoordinates?.longitude ?? null,
        destination_latitude:
          finalDestinationCoordinates?.latitude ?? null,
        destination_longitude:
          finalDestinationCoordinates?.longitude ?? null,

        distance_km: fare.distanceKm,
        fare_amount: fare.fareAmount,
        payment_status: "unpaid",
      })
      .select(
        "id, pickup, destination, pickup_latitude, pickup_longitude, destination_latitude, destination_longitude, status, created_at, distance_km, fare_amount, payment_status"
      )
      .single();

    if (error) {
      console.error("Could not save booking:", error.message);

      return Response.json(
        {
          error:
            "We couldn't save your ride request. Please try again. If this continues, check that the four coordinate columns have been added to your Supabase bookings table.",
        },
        { status: 500 }
      );
    }

    // Notification failure must not undo a successful booking.
    try {
      await createNotification({
        supabase,
        userId,
        title: "Ride requested successfully",
        message: `Your ride from ${pickup} to ${destination} has been requested.`,
        bookingId: data.id,
      });
    } catch (notificationError) {
      console.error(
        "Booking notification failed:",
        notificationError.message
      );
    }

    return Response.json(
      {
        message: "Your ride request has been saved!",
        booking: data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Booking POST error:", error.message);

    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
