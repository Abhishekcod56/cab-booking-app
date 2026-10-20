
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key);
}

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json({ error: "Please sign in first." }, { status: 401 });
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid request body." }, { status: 400 });
    }

    const fullName =
      typeof body.fullName === "string" ? body.fullName.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const vehicleType =
      typeof body.vehicleType === "string" ? body.vehicleType.trim() : "";
    const vehicleRegistration =
      typeof body.vehicleRegistration === "string"
        ? body.vehicleRegistration.trim().toUpperCase()
        : "";
    const licenseNumber =
      typeof body.licenseNumber === "string"
        ? body.licenseNumber.trim().toUpperCase()
        : "";

    const allowedVehicleTypes = ["car", "motorcycle", "auto"];

    if (
      fullName.length < 2 ||
      fullName.length > 100 ||
      phone.length < 7 ||
      phone.length > 20 ||
      !/^[0-9+()\-\s]+$/.test(phone) ||
      !allowedVehicleTypes.includes(vehicleType) ||
      vehicleRegistration.length < 3 ||
      vehicleRegistration.length > 30 ||
      licenseNumber.length < 3 ||
      licenseNumber.length > 50
    ) {
      return Response.json(
        {
          error:
            "Enter a valid name, phone number, vehicle type, registration number, and licence number.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: existing, error: lookupError } = await supabase
      .from("driver_profiles")
      .select("clerk_user_id, is_approved")
      .eq("clerk_user_id", userId)
      .maybeSingle();

    if (lookupError) {
      console.error("Driver profile lookup failed:", lookupError.message);
      return Response.json(
        { error: "Could not check your application." },
        { status: 500 }
      );
    }

    if (existing?.is_approved) {
      return Response.json({
        success: true,
        isApproved: true,
        message: "Your driver account is already approved.",
      });
    }

    const profile = {
      clerk_user_id: userId,
      full_name: fullName,
      phone,
      vehicle_type: vehicleType,
      vehicle_registration: vehicleRegistration,
      license_number: licenseNumber,
      is_approved: false,
    };

    const query = existing
      ? supabase
          .from("driver_profiles")
          .update({
            full_name: profile.full_name,
            phone: profile.phone,
            vehicle_type: profile.vehicle_type,
            vehicle_registration: profile.vehicle_registration,
            license_number: profile.license_number,
          })
          .eq("clerk_user_id", userId)
      : supabase.from("driver_profiles").insert(profile);

    const { error: saveError } = await query;

    if (saveError) {
  console.error("Driver application save failed:", {
    message: saveError.message,
    code: saveError.code,
    details: saveError.details,
    hint: saveError.hint,
  });

  return Response.json(
    {
      error: "Could not save your application.",
      debug: saveError.message,
      code: saveError.code,
    },
    { status: 500 }
  );
}

    return Response.json({
      success: true,
      isApproved: false,
      message: existing
        ? "Your pending application details have been updated."
        : "Your driver application has been submitted for admin approval.",
    });
  } catch (error) {
    console.error("Driver application error:", error);
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
