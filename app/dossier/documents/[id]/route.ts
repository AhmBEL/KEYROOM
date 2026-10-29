import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Ouvre un document par URL signée de 5 minutes, après contrôle des droits (RLS) et journal.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/connexion", request.url));
  if (!UUID_RE.test(id)) return new NextResponse("Document introuvable.", { status: 404 });

  // La lecture passe par la session de l'utilisateur : la RLS décide s'il a le droit.
  const { data: doc } = await session.supabase
    .from("documents").select("id, deal_id, storage_path, filename").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Document introuvable.", { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("dossiers").createSignedUrl(doc.storage_path, 300);
  if (error || !data) return new NextResponse("Le document n'a pas pu être ouvert. Réessayez.", { status: 502 });

  await admin.from("audit_log").insert({
    deal_id: doc.deal_id, user_id: session.user.id, action: "document_consulte", details: { document_id: doc.id },
  });
  const res = NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
