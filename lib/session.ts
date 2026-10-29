import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "admin" | "partie_mandat" | "partie_investisseurs";

export async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("prenom, nom, role")
    .eq("id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile: profile as { prenom: string; nom: string; role: Role } | null };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.profile?.role !== "admin") redirect("/dossier");
  return { ...session, profile: session.profile };
}
