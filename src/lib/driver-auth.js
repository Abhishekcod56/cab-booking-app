
export async function isApprovedDriver(supabase, userId) {
  if (!supabase || !userId) {
    console.error("Driver check: Supabase client or Clerk user ID is missing.");
    return false;
  }

  // First check whether a profile exists for this Clerk user.
  const { data: profile, error: profileError } = await supabase
    .from("driver_profiles")
    .select("clerk_user_id, is_approved")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Driver profile query failed:", profileError.message);
    throw new Error("Could not read driver profile.");
  }

  if (!profile) {
    console.warn(
      "Driver profile not found for the signed-in Clerk user:",
      userId
    );
    return false;
  }

  console.log("Driver profile found:", {
    clerkUserIdMatches: profile.clerk_user_id === userId,
    isApproved: profile.is_approved,
  });

  return profile.is_approved === true;
}
