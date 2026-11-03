import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { blocksFor, display, type Answers } from "@/lib/questionnaire";

// On neutralise les cellules qui commenceraient par = + - @ (formules Excel).
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
};

// Export CSV (séparateur « ; », ouvert directement par Excel en français). Admin uniquement.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.profile?.role !== "admin") return new NextResponse("Accès refusé.", { status: 403 });

  const form = new URL(request.url).searchParams.get("form");
  if (form !== "mandat" && form !== "investisseurs") return new NextResponse("Formulaire inconnu.", { status: 400 });
  const role = form === "mandat" ? "partie_mandat" : "partie_investisseurs";

  const { data } = await session.supabase
    .from("form_submissions").select("lang, answers, created_at").eq("form", form).order("created_at", { ascending: false }).limit(5000);

  const questions = blocksFor(role).flatMap((b) => b.questions);
  const header = ["Date de réponse", "Langue", ...questions.map((q) => q.label)];
  const lines = (data ?? []).map((r) => {
    const a = r.answers as Answers;
    return [
      new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }),
      r.lang === "en" ? "anglais" : "français",
      ...questions.map((q) => display(a[q.id])),
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
