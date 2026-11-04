import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { inputFields, optionLabel, sectionsFor, type FormRole, type Stored } from "@/lib/formdef";

// On neutralise les cellules qui commenceraient par = + - @ (formules Excel).
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Export CSV (séparateur « ; », ouvert directement par Excel en français). Admin uniquement.
// Une colonne par question, en français ; les choix sont relus depuis leur identifiant.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.profile?.role !== "admin") return new NextResponse("Accès refusé.", { status: 403 });

  const form = new URL(request.url).searchParams.get("form");
  if (form !== "mandat" && form !== "investisseurs") return new NextResponse("Formulaire inconnu.", { status: 400 });
  const role: FormRole = form;

  const { data } = await session.supabase
    .from("form_submissions").select("lang, answers, created_at").eq("form", form).order("created_at", { ascending: false }).limit(5000);

  const fields = inputFields(role);
  const checks = sectionsFor(role).flatMap((s) => s.checks ?? []);
  const header = ["Date de réponse", "Langue choisie", "Date de validation", ...fields.map((f) => f.label.fr), "4 déclarations cochées"];
  const lines = (data ?? [])
    .filter((r) => (r.answers as Stored).v === 2)
    .map((r) => {
      const a = r.answers as Stored;
      return [
        new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
        a.lang === "en" ? "anglais" : "français",
        new Date(a.validated_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
        ...fields.map((f) => {
          const v = a.fields[f.id];
          if (!v) return "";
          return "id" in v ? optionLabel(role, f.id, v.id, "fr") ?? v.label : v.value;
        }),
        a.declarations.length === checks.length ? "Oui" : "Non",
      ].map(cell).join(";");
    });
  const csv = "﻿" + [header.map(cell).join(";"), ...lines].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keyroom-${form}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
