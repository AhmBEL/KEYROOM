"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { finalizeUpload, prepareUpload } from "@/app/dossier/depot/actions";

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const MAX = 20 * 1024 * 1024;

export function UploadForm({ dealId, category, label }: { dealId: string; category: string; label: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(false);
    const file = input.current?.files?.[0];
    if (!file) { setError("Choisissez d'abord un fichier."); return; }
    if (file.size > MAX) { setError("Ce fichier dépasse 20 Mo. Réduisez-le, puis recommencez."); return; }
    setBusy(true);
    try {
      const prep = await prepareUpload({ dealId, category, mime: file.type, size: file.size });
      if (!prep.ok) { setError(prep.message); return; }
      const { error: upErr } = await createClient().storage.from("dossiers").uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
      if (upErr) { setError("L'envoi a échoué. Vérifiez votre connexion et réessayez."); return; }
      const done = await finalizeUpload({ dealId, category, mime: file.type, size: file.size, path: prep.path, filename: file.name });
      if (!done.ok) { setError(done.message ?? "Le dépôt a échoué."); return; }
      setOk(true);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch {
      setError("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="kr-form" noValidate>
      <div className="kr-field">
        <label htmlFor={`file-${category}`}>{label}</label>
        <input id={`file-${category}`} ref={input} type="file" accept={ACCEPT} className="kr-input kr-file" />
        <p className="kr-hint">PDF, DOCX, JPG ou PNG, 20 Mo au plus. Sur téléphone, vous pouvez aussi prendre une photo.</p>
        {error && <p className="kr-error" role="alert">{error}</p>}
        {ok && <p className="kr-success" role="status">Terminé : le document est déposé.</p>}
      </div>
      <button type="submit" className="kr-btn kr-btn--primary" disabled={busy}>{busy ? "Envoi…" : "Déposer"}</button>
    </form>
  );
}
