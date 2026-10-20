
import { NextResponse } from "next/server";
import { calculateFare } from "@/lib/fare";

export async function POST(request) {
  try {
    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const pickup =
      typeof body?.pickup === "string" ? body.pickup.trim() : "";

    const destination =
      typeof body?.destination === "string"
        ? body.destination.trim()
        : "";

    const pickupCoordinates = body?.pickupCoordinates;
    const destinationCoordinates = body?.destinationCoordinates;

    if (
      !pickup ||
      !destination ||
      pickup.length > 200 ||
      destination.length > 200
    ) {
      return NextResponse.json(
        {
          error: "Enter both locations, up to 200 characters each.",
        },
        { status: 400 }
      );
    }

    if (pickup.toLowerCase() === destination.toLowerCase()) {
      return NextResponse.json(
        {
          error: "Pickup and destination must be different.",
        },
        { status: 400 }
      );
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

    const hasPickupCoordinates = isValidCoordinates(pickupCoordinates);
    const hasDestinationCoordinates = isValidCoordinates(
      destinationCoordinates
    );

    // Use coordinates when available; otherwise use the place names.
    const fare = await calculateFare(
      hasPickupCoordinates ? pickupCoordinates : pickup,
      hasDestinationCoordinates ? destinationCoordinates : destination
    );

    return NextResponse.json(fare);
  } catch (error) {
    console.error("Fare estimate error:", error.message);

    return NextResponse.json(
      {
        error:
          "Could not calculate a driving route. Check the locations and try again.",
      },
      { status: 502 }
    );
  }
}
