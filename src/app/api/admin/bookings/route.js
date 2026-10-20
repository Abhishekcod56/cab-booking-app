
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";


export async function GET() {
  try { 
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!isAdmin(userId)) {
      return Response.json({ error: "Admin access required." }, { status: 403 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error("Supabase environment variables are missing.");
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, clerk_user_id, pickup, destination, status, distance_km, fare_amount, created_at"
      )
      .eq("status", "requested")
      .is("driver_clerk_user_id", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Admin rides query failed:", error.message);
      return Response.json(
        { error: "Could not load available rides." },
        { status: 500 }
      );
    }

    return Response.json({ rides: data ?? [] });
  } catch (error) {
    console.error("Admin rides API error:", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
