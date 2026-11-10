import { SoonList } from "@/components/demo/Soon";

export default function SoonPage() {
  return (
    <>
      <h1 className="kr-title-2">À venir</h1>
      <p className="kr-body">Ces fonctions apparaissent dans la démonstration avec la mention « Bientôt disponible ». Elles ne sont pas encore actives.</p>
      <SoonList />
    </>
  );
}
