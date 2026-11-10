// Version de démonstration : tout est enregistré dans le navigateur, rien n'est envoyé ni stocké ailleurs.
export type ProfileKind = "agent" | "apporteur" | "proprietaire" | "acquereur" | "mandat_vente" | "mandat_recherche" | "notaire" | "avocat" | "autre";
export type RoleKind = "sale" | "search" | "introducer" | "agent" | "legal" | "other";
export type Side = "sale" | "search";
export type Req = "agreement" | "forms" | "docs" | "approval";
export type Reveal = "documents" | "identities";

export type Profile = {
  kind: ProfileKind | null; firstName: string; lastName: string; email: string; via: "google" | "email";
  company: string; country: string; address: string; phone: string; saved: boolean; onboarded: boolean;
};

export type DocFile = { name: string; size: number; at: string };
export type Participant = {
  id: string; name: string; email: string; role: RoleKind; isAdmin: boolean;
  accepted: "pending" | "accepted" | "changes";
  answers: Record<string, string>; submitted: boolean;
  docs: Record<string, DocFile>;
  signed: Record<string, string>;      // identifiant d'étape -> date de signature
  approved: Record<string, boolean>;   // identifiant d'étape -> accord de révélation
  signature?: string;                  // signature dessinée (image), réutilisée pour les accords et le mandat
  mandate?: { status: "draft" | "validated" | "signed" | "sent"; signedBy?: string; signedAt?: string; sentAt?: string; signatureImg?: string };
};

export type Step = {
  id: string; title: string; sub: string; group: number; side?: Side; enabled: boolean;
  requires: Req[]; reveals: Reveal[]; status: "done" | "current" | "upcoming"; custom?: boolean;
};
export type DocReq = { id: string; side: Side | "all"; label: string; required: boolean; adminAccess: boolean; enabled: boolean; soon?: string };
export type Question = { id: string; side: Side; label: string; type: "text" | "single"; options?: string[]; required: boolean; enabled: boolean; mandate?: boolean };
export type ChangeRequest = { id: string; by: string; kind: "remove" | "add" | "comment"; stepId?: string; text: string; status: "open" | "accepted" | "declined" };
export type LogEntry = { at: string; who: string; text: string };

export type Project = {
  id: string; name: string; templateId: string; createdAt: string; adminId: string;
  participants: Participant[]; steps: Step[]; docReqs: DocReq[]; questions: Question[];
  options: { revealRule: "both" | "admin"; mandate: boolean; preset: "simple" | "secure" | "custom" };
  revealed: { documents: boolean; identities: boolean };
  changes: ChangeRequest[]; log: LogEntry[]; invited: boolean;
};

export type DemoState = { profile: Profile | null; projects: Project[]; actor: Record<string, string> };
