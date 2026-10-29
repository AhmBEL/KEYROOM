import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Keyroom",
    short_name: "Keyroom",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5ef",
    theme_color: "#0b1f33",
    icons: [
      { src: "/brand/png/icone-application-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/png/icone-application-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
