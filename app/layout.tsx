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

// Thème sombre selon le réglage du téléphone, appliqué avant l'affichage.
const THEME_SCRIPT =
  "try{document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){}";

export const metadata: Metadata = {
  icons: { icon: [{ url: "/brand/icone-application.svg", type: "image/svg+xml" }] },
  title: "Keyroom",
  description: "Hotels open new opportunities.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
