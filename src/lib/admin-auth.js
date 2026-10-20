
export function isAdmin(userId) {
  if (!userId) return false;

  const adminIds = (process.env.ADMIN_CLERK_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return adminIds.includes(userId);
}
