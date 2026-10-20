
/**
 * Save a notification for a CabGo user.
 *
 * Call this only from trusted server-side code,
 * such as booking APIs or verified Stripe webhooks.
 */
export async function createNotification({
  supabase,
  userId,
  title,
  message,
  bookingId = null,
}) {
  if (!supabase || !userId || !title || !message) {
    console.error("Notification not created: required data is missing.");
    return { success: false };
  }

  const { error } = await supabase
    .from("notifications")
    .insert({
      clerk_user_id: userId,
      title,
      message,
      booking_id: bookingId,
      is_read: false,
    });

  if (error) {
    console.error("Failed to create notification:", error.message);
    return { success: false };
  }

  return { success: true };
}
