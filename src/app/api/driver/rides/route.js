
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isApprovedDriver } from "@/lib/driver-auth";

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

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Please sign in." }, { status: 401 });
    }

    const supabase = getSupabase();

    const approved = await isApprovedDriver(supabase, userId);

    if (!approved) {
      return Response.json(
        { error: "Your driver account is not approved." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, pickup, destination, status, created_at, distance_km, fare_amount, payment_status, driver_clerk_user_id"
      )
      .or(
        `driver_clerk_user_id.eq.${userId},and(driver_clerk_user_id.is.null,status.eq.requested)`
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load driver rides:", error.message);
      return Response.json(
        { error: "Could not load driver rides." },
        { status: 500 }
      );
    }

    return Response.json({ rides: data || [] });
  } catch (error) {
    console.error("Driver rides GET error:", error);
    return Response.json(
      { error: "Could not load driver rides." },
      { status: 500 }
    );
  }
}
