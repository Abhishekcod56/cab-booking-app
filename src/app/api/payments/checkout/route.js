
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request) {
  try {
    // 1. Verify the signed-in CabGo user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in before paying." },
        { status: 401 }
      );
    }

    // 2. Get the booking ID
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json(
        { error: "A valid booking ID is required." },
        { status: 400 }
      );
    }

    // 3. Find this booking and include its status
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, clerk_user_id, pickup, destination, fare_amount, status, payment_status"
      )
      .eq("id", bookingId)
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (bookingError) {
      console.error("Fetch booking error:", bookingError.message);

      return NextResponse.json(
        { error: "Could not retrieve your booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found for your account." },
        { status: 404 }
      );
    }

    // 4. Allow payment only after the ride is completed
    if (booking.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Payment is available only after your ride is completed.",
        },
        { status: 400 }
      );
    }

    // 5. Prevent paying twice
    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: "This booking has already been paid." },
        { status: 400 }
      );
    }

    const fare = Number(booking.fare_amount);

    if (!Number.isFinite(fare) || fare <= 0) {
      return NextResponse.json(
        { error: "The booking has an invalid fare." },
        { status: 400 }
      );
    }

    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      console.error("A required payment environment variable is missing.");

      return NextResponse.json(
        { error: "Payment service is not configured correctly." },
        { status: 500 }
      );
    }

    // 6. Create Stripe Checkout session
    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "CabGo Ride",
              description: `${booking.pickup} to ${booking.destination}`,
            },
            unit_amount: Math.round(fare * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
        clerkUserId: userId,
      },
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/my-bookings?payment=cancelled`,
    });

    // 7. Save the Checkout session against this booking
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "pending",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", booking.id)
      .eq("clerk_user_id", userId);

    if (updateError) {
      console.error("Failed to save Stripe session:", updateError.message);

      return NextResponse.json(
        { error: "Could not save the payment session." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error.message);

    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 }
    );
  }
}
