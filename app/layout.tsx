import type { Metadata, Viewport } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";

const serif = Playfair_Display({
  subsets: ["latin"],
  weight: "500",
  display: "swap",
  variable: "--font-serif-loaded",
});
const sans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-sans-loaded",
});

export const metadata: Metadata = {
  icons: { icon: [{ url: "/brand/icone-application.svg", type: "image/svg+xml" }] },
  title: "Keyroom",
  description: "Hotels open new opportunities.",
};

export const viewport: Viewport = {
  themeColor: "#0b1f33",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Thème sombre sur tous les appareils (la langue de la page est ajustée côté navigateur par les questionnaires).
    <html lang="fr" data-theme="dark" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
