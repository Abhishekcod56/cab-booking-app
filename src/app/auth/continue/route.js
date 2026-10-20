
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isApprovedDriver } from "@/lib/driver-auth";

export async function GET(request) {
  const { userId } = await auth();
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  // A role value is only a requested destination, not authorization.
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role !== "rider" && role !== "driver") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Riders can continue to the existing booking homepage.
  if (role === "rider") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Driver approval is checked on the server.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

 if (!supabaseUrl || !serviceRoleKey) {
  console.error("Supabase environment configuration:", {
    urlPresent: Boolean(supabaseUrl),
    serviceRoleKeyPresent: Boolean(serviceRoleKey),
    workingDirectory: process.cwd(),
  });

  return NextResponse.redirect(
    new URL("/driver/pending?reason=configuration", request.url)
  );
}

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const approved = await isApprovedDriver(supabase, userId);

    if (!approved) {
      return NextResponse.redirect(
        new URL("/driver/pending", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/driver/dashboard", request.url)
    );
  } catch (error) {
    console.error("Driver approval check failed:", error);

    // Fail closed: never grant dashboard access when verification fails.
    return NextResponse.redirect(
      new URL("/driver/pending?reason=verification", request.url)
    );
  }
}
