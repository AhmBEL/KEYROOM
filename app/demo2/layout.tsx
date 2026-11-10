import type { Metadata } from "next";
import { DemoProvider } from "@/lib/demo/store";
import { Shell2 } from "@/components/demo2/Shell2";
import { ToastProvider } from "@/components/demo2/ui";
import "./demo2.css";

export const metadata: Metadata = { title: "Démonstration V2 — Keyroom", robots: { index: false, follow: false } };

export default function Demo2Layout({ children }: { children: React.ReactNode }) {
  return <DemoProvider><ToastProvider><Shell2>{children}</Shell2></ToastProvider></DemoProvider>;
}
