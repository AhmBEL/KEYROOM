"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ROLES, templateById } from "@/lib/demo/catalog";
import { currentGroup, enabledSteps } from "@/lib/demo/rules";
import { useDemo } from "@/lib/demo/store";

export default function ProjectsPage() {
  const router = useRouter();
  const { state, seedExample } = useDemo();
  const profile = state.profile;
  return (
    <>
      <h1 className="kr-title-2">Mes projets</h1>
      <div className="kr-row" style={{ marginBottom: "var(--space-5)" }}>
        <Link href="/demo/projets/nouveau" className="kr-btn kr-btn--primary">Créer un projet</Link>
        {profile && <button type="button" className="kr-btn kr-btn--outline" onClick={() => router.push(`/demo/projets/${seedExample(profile)}`)}>Charger un projet d'exemple</button>}
      </div>
      {state.projects.length === 0 ? (
        <div className="kr-banner"><p>Aucun projet pour le moment. Créez-en un, ou chargez le projet d'exemple pour explorer.</p></div>
      ) : (
        <div className="kr-grid">
          {state.projects.map((p) => {
            const me = p.participants.find((x) => x.id === state.actor[p.id]) ?? p.participants[0];
            const steps = enabledSteps(p); const done = steps.filter((x) => x.status === "done").length; const g = currentGroup(p);
            const cur = steps.filter((x) => x.group === g && x.status !== "done").map((x) => x.title).join(" · ");
            return (
              <Link key={p.id} href={`/demo/projets/${p.id}`} className="kr-card kr-card--link">
                <p className="kr-card__ref">{templateById(p.templateId).name}</p>
                <h2 className="kr-title-3">{p.name}</h2>
                <p className="kr-small">{p.participants.length} participant{p.participants.length > 1 ? "s" : ""} · mon rôle : {ROLES[me.role].label}</p>
                <p className="kr-small">{done} étape{done > 1 ? "s" : ""} sur {steps.length} terminée{done > 1 ? "s" : ""}{cur ? ` · en cours : ${cur}` : steps.length && done === steps.length ? " · processus terminé" : ""}</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
