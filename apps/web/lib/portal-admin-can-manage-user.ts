import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns true if the current user (from supabase session) can manage the target user:
 * - superadmin: can manage any user
 * - store_admin: can manage users that have a role in a store where the caller has store_admin access
 */
export async function canManageUser(
  supabase: SupabaseClient,
  targetUserId: string
): Promise<boolean> {
  const { data: isSuper } = await supabase.rpc("current_user_is_superadmin");
  if (isSuper) return true;
  const { data: bindings } = await supabase
    .from("user_role_bindings")
    .select("store_id")
    .eq("user_id", targetUserId);
  const storeIds = (bindings ?? [])
    .map((b: { store_id: string | null }) => b.store_id)
    .filter((id): id is string => id != null);
  for (const sid of storeIds) {
    const { data: can } = await supabase.rpc("current_user_can_access_settings", {
      p_store_id: sid,
    });
    if (can) return true;
  }
  return false;
}
