"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Écrit la connexion dans le journal. L'identité vient de la session, jamais du client.
export async function recordLogin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const admin = createAdminClient();
  await admin.from("audit_log").insert({ user_id: data.user.id, action: "connexion" });
}
