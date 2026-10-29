"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/admin/dossiers/actions";

export function AdminAction({ action, label, primary, confirm }: {
  action: () => Promise<ActionResult>; label: string; primary?: boolean; confirm?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>(null);
  return (
    <div className="kr-action">
      <button type="button" className={`kr-btn ${primary ? "kr-btn--primary" : "kr-btn--outline"}`} disabled={pending}
        onClick={() => start(async () => {
          if (confirm && !window.confirm(confirm)) return;
          setResult(await action());
          router.refresh();
        })}>
        {pending ? "En cours…" : label}
      </button>
      {result && <p className={result.ok ? "kr-success" : "kr-error"} role={result.ok ? "status" : "alert"}>{result.ok ? "Terminé : " : ""}{result.message}</p>}
    </div>
  );
}
