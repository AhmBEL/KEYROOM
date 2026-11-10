import type { Metadata } from "next";
import { DemoProvider } from "@/lib/demo/store";
import { DemoShell } from "@/components/demo/DemoShell";

export const metadata: Metadata = { title: "Démonstration — Keyroom", robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider><DemoShell>{children}</DemoShell></DemoProvider>;
}
