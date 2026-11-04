import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/session";
import { inspectKey, type KeyInfo } from "@/lib/envcheck";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Diagnostic — Keyroom", robots: { index: false } };
export const dynamic = "force-dynamic";

const line = (label: string, ok: boolean, text: string) => (
  <li key={label}>
    <span>{ok ? "OK" : "À corriger"} · {label}</span>
    <span className="kr-small">{text}</span>
  </li>
);
const describe = (k: KeyInfo) => (k.present ? `${k.kind}, ${k.length} caractères${k.badChars ? ", CARACTÈRES INVALIDES" : ""}` : "absente");

export default async function DiagnosticPage() {
  await requireAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = inspectKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const service = inspectKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const names = Object.keys(process.env).filter((n) => /SUPABASE|SERVICE_ROLE/i.test(n)).sort();

  // Test réel : lecture avec la clé secrète (aucune écriture).
  let test = "non exécuté";
  let testOk = false;
  try {
    const { error } = await createAdminClient().from("form_submissions").select("id", { count: "exact", head: true });
    testOk = !error;
    test = error ? `refusé (${error.code || "sans code"})` : "réussi";
  } catch (e) {
    test = e instanceof Error && /INVALID/.test(e.message) ? "clé invalide" : "clé absente ou inutilisable";
  }

  let host = "";
  try { host = new URL(url).host; } catch { /* adresse invalide */ }

  return (
    <main className="kr-page">
      <Logo width={160} />
      <Link href="/admin" className="kr-link">← Administration</Link>
      <h1 className="kr-title-2">Diagnostic</h1>
      <p className="kr-small">Aucune clé n'est affichée, seulement leur état.</p>
      <ul className="kr-log">
        {line("Adresse Supabase", Boolean(host) && host.endsWith(".supabase.co"), host || "absente ou invalide")}
        {line("Clé publique", anon.present && !anon.badChars && /publique/.test(anon.kind), describe(anon))}
        {line("Clé secrète (serveur)", service.present && !service.badChars && /secrète/.test(service.kind), describe(service))}
        {line("Test d'accès avec la clé secrète", testOk, test)}
        {line("Adresse du site", site.startsWith("https://") && !site.endsWith("/"), site || "absente")}
      </ul>
      <h2 className="kr-title-3">Variables Supabase trouvées</h2>
      <p className="kr-small">{names.length ? names.join(", ") : "aucune"}</p>
    </main>
  );
}
