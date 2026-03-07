/**
 * Bootstrap superadmin: suporte@bwb.pt with initial password "naomexer".
 * Idempotent: creates user if not exists, sets user_metadata.must_change_password = true.
 * Run with SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL (from APP_DIR/.env).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";

const EMAIL = "suporte@bwb.pt";
const INITIAL_PASSWORD = "naomexer";

async function main() {
  const appDir = process.env.APP_DIR || process.cwd();
  const envPath = resolve(appDir, ".env");
  const { config } = await import("dotenv");
  config({ path: envPath });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const users = listData?.users ?? [];
  const user = users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());

  let superadminJustCreated = false;
  if (user) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, must_change_password: true, bootstrap: true },
    });
    console.log("Superadmin exists, metadata updated:", user.id);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: INITIAL_PASSWORD,
      email_confirm: true,
      user_metadata: { must_change_password: true, bootstrap: true },
    });
    if (error) {
      console.error("Failed to create superadmin:", error.message);
      process.exit(1);
    }
    console.log("Superadmin created:", created.user?.id);
    superadminJustCreated = true;
  }

  const { data: listData2 } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const superadminUser = listData2?.users?.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
  if (superadminUser?.id) {
    const profilePayload = {
      id: superadminUser.id,
      email: EMAIL,
      ...(superadminJustCreated ? { renew_password: true } : {}),
    };
    await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
    const { error: bindErr } = await supabase.from("user_role_bindings").insert({
      user_id: superadminUser.id,
      role_code: "superadmin",
      tenant_id: null,
      store_id: null,
    });
    if (bindErr && bindErr.code !== "23505") {
      console.error("Binding insert error:", bindErr.message);
    } else if (!bindErr) {
      console.log("Superadmin binding created.");
    }
    console.log("Profile and superadmin binding ensured.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
