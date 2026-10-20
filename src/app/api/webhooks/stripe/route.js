
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("Missing Stripe signature or webhook secret.");

    return NextResponse.json(
      { error: "Missing Stripe webhook configuration." },
      { status: 400 }
    );
  }

  let event;

  try {
    const body = await request.text();

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error.message);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 }
    );
  }

  try {
    if (
      event.type !== "checkout.session.completed" &&
      event.type !== "checkout.session.async_payment_succeeded"
    ) {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object;

    console.log("Stripe payment event received:", {
      eventType: event.type,
      sessionId: session.id,
      paymentStatus: session.payment_status,
    });

    // Do not mark a booking paid unless Stripe confirms payment.
    if (session.payment_status !== "paid") {
      console.log("Payment is not yet confirmed as paid.");
      return NextResponse.json({ received: true });
    }

    const bookingId = session.metadata?.bookingId;
    const clerkUserId = session.metadata?.clerkUserId;

    if (!bookingId || !clerkUserId) {
      console.error("Missing booking ID or user ID in Stripe metadata.");

      return NextResponse.json(
        { error: "Missing booking metadata." },
        { status: 400 }
      );
    }

    // Find the booking associated with this Checkout Session.
    const { data: booking, error: lookupError } = await supabase
      .from("bookings")
      .select("id, stripe_checkout_session_id, payment_status")
      .eq("id", bookingId)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (lookupError) {
      console.error("Booking lookup failed:", lookupError.message);

      return NextResponse.json(
        { error: "Could not verify booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      console.error("Booking not found:", bookingId);

      return NextResponse.json(
        { error: "Booking not found." },
        { status: 404 }
      );
    }

    // Make sure this is the Checkout Session saved for this booking.
    if (booking.stripe_checkout_session_id !== session.id) {
      console.error("Checkout Session ID mismatch:", {
        bookingSessionId: booking.stripe_checkout_session_id,
        receivedSessionId: session.id,
      });

      return NextResponse.json(
        { error: "Checkout Session mismatch." },
        { status: 400 }
      );
    }

    if (booking.payment_status === "paid") {
      console.log("Booking is already marked as paid:", bookingId);

      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const { data: updatedBookings, error: updateError } =
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          stripe_payment_intent_id: paymentIntentId,
        })
        .eq("id", bookingId)
        .eq("clerk_user_id", clerkUserId)
        .eq("stripe_checkout_session_id", session.id)
        .select("id, payment_status");

    if (updateError) {
      console.error("Failed to update payment status:", updateError.message);

      return NextResponse.json(
        { error: "Could not update booking payment status." },
        { status: 500 }
      );
    }

    if (!updatedBookings || updatedBookings.length === 0) {
      console.error("No booking was updated for session:", session.id);

      return NextResponse.json(
        { error: "Booking payment status was not updated." },
        { status: 500 }
      );
    }

    console.log("Booking payment successfully updated:", {
      bookingId,
      paymentStatus: updatedBookings[0].payment_status,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error.message);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
