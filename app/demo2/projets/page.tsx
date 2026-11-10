"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/demo2/Icon";
import { Arch, Avatar, Ring, Tile } from "@/components/demo2/ui";
import { ROLES, roleShort } from "@/lib/demo/catalog";
import { nextLine, projectProgress } from "@/lib/demo/next";
import { useDemo } from "@/lib/demo/store";

export default function Projects2() {
  const router = useRouter();
  const { state, seedExample } = useDemo();
  const profile = state.profile;
  return (
    <div className="kr2-screen">
      <h1 className="kr2-title">{state.projects.length ? "Vos projets" : "Créez votre premier projet"}</h1>
      {state.projects.length === 0 && <><div style={{ display: "grid", justifyItems: "center" }}><Arch icon="folder" size={110} /></div><p className="kr2-help">Vous choisissez un modèle, vous invitez les parties et vous réglez le processus. Quatre écrans suffisent.</p></>}
      <Tile icon="plus" title="Nouveau projet" text="Vendre, chercher ou accompagner une transaction" onClick={() => router.push("/demo2/projets/nouveau")} />
      {state.projects.length === 0 && profile && <Tile icon="star" title="Découvrir un exemple" text="Un projet déjà entamé, pour explorer" onClick={() => router.push(`/demo2/projets/${seedExample(profile)}`)} />}
      <div className="kr2-grid">
        {state.projects.map((p) => {
          const me = p.participants.find((x) => x.id === state.actor[p.id]) ?? p.participants[0];
          return (
            <Link key={p.id} href={`/demo2/projets/${p.id}`} className="kr2-task" style={{ textDecoration: "none", alignItems: "center", padding: "var(--space-4)" }}>
              <Ring value={projectProgress(p)} size={56} />
              <span className="kr2-task__txt" style={{ gap: 4 }}>
                <strong style={{ fontWeight: 600 }}>{p.name}</strong>
                <span>{roleShort(me.role)} · {ROLES[me.role].label.split(" (")[0]}</span>
                <span style={{ color: "var(--accent-text)" }}>{nextLine(p, me)}</span>
                <span className="kr2-row" style={{ gap: 4, marginTop: 4 }}>{p.participants.slice(0, 5).map((x) => <Avatar key={x.id} name={x.name} size={26} />)}</span>
              </span>
              <Icon name="chevron" size={18} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
