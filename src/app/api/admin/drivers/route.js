
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { isAdmin } from "@/lib/admin-auth";


function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key);
}

export async function GET() {
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

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("driver_profiles")
      .select(
        "clerk_user_id, is_approved, created_at, full_name, phone, vehicle_type, vehicle_registration, license_number"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load driver applications:", error.message);
      return Response.json(
        { error: "Could not load driver applications." },
        { status: 500 }
      );
    }

    return Response.json({ drivers: data ?? [] });
  } catch (error) {
    console.error("Admin drivers GET error:", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
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

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { driverClerkUserId, isApproved } = body;

    if (
      typeof driverClerkUserId !== "string" ||
      !driverClerkUserId.startsWith("user_") ||
      typeof isApproved !== "boolean"
    ) {
      return Response.json(
        { error: "A valid driver ID and approval value are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("driver_profiles")
      .update({ is_approved: isApproved })
      .eq("clerk_user_id", driverClerkUserId)
      .select("clerk_user_id, is_approved, created_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to update driver approval:", error.message);
      return Response.json(
        { error: "Could not update driver approval." },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: "Driver application not found." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, driver: data });
  } catch (error) {
    console.error("Admin drivers PATCH error:", error);
    return Response.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
