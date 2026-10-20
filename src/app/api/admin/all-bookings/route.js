
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";

export async function GET() {
  try {
    
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Please sign in." },
        { status: 401 }
      );
    }

    if (!isAdmin(userId)) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        clerk_user_id,
        pickup,
        destination,
        status,
        distance_km,
        fare_amount,
        payment_status,
        driver_clerk_user_id,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Admin bookings query failed:", error.message);

      return NextResponse.json(
        { error: "Could not load rides." },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings: data || [] });
  } catch (error) {
    console.error("Admin bookings error:", error.message);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
