import "server-only";

export type KeyInfo = { present: boolean; length: number; kind: string; badChars: boolean };

// Décrit une clé sans jamais l'afficher : présence, longueur, type et caractères invalides.
export function inspectKey(raw: string | undefined): KeyInfo {
  if (!raw) return { present: false, length: 0, kind: "absente", badChars: false };
  const key = raw.trim().replace(/^["']|["']$/g, "");
  const badChars = /[^\x21-\x7e]/.test(key);
  let kind = "format inconnu";
  if (key.startsWith("sb_secret_")) kind = "clé secrète (sb_secret_…)";
  else if (key.startsWith("sb_publishable_")) kind = "clé publique (sb_publishable_…)";
  else if (key.split(".").length === 3) {
    try {
      const role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
      kind = role === "service_role" ? "clé secrète (service_role)" : role === "anon" ? "clé publique (anon)" : `JWT, rôle « ${role} »`;
    } catch {
      kind = "JWT illisible";
    }
  }
  return { present: true, length: key.length, kind, badChars };
}
