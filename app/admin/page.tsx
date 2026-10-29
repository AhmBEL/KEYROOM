import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { requireAdmin } from "@/lib/session";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "Administration — Keyroom" };

const ROLE_LABEL: Record<string, string> = { partie_mandat: "Mandat", partie_investisseurs: "Investisseurs" };

export default async function AdminPage() {
  const { supabase, profile } = await requireAdmin();
  const [{ data: deals }, { data: members }, { data: people }] = await Promise.all([
    supabase.from("deals").select("id, reference").order("created_at", { ascending: false }),
    supabase.from("deal_members").select("deal_id, user_id, role"),
    supabase.from("profiles").select("id, prenom, nom"),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, `${p.prenom} ${p.nom}`]));

  return (
    <main className="kr-page">
      <Logo width={160} />
      <h1 className="kr-title-2">Bonjour {profile.prenom}</h1>

      <h2 className="kr-title-3">Inviter une partie</h2>
      <InviteForm deals={deals ?? []} />

      <h2 className="kr-title-3">Dossiers</h2>
      {deals?.length ? deals.map((d) => (
        <section key={d.id} className="kr-card">
          <p className="kr-card__ref">{d.reference}</p>
          <Link href={`/admin/dossiers/${d.id}`} className="kr-link">Ouvrir le dossier</Link>
          {(members ?? []).filter((m) => m.deal_id === d.id).map((m) => (
            <p key={m.user_id} className="kr-small">{ROLE_LABEL[m.role]} : {name.get(m.user_id)}</p>
          ))}
        </section>
      )) : <p className="kr-body">Aucun dossier pour le moment.</p>}

      <SignOutButton />
    </main>
  );
}
