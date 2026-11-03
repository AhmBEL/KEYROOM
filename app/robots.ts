import type { MetadataRoute } from "next";

// Les espaces privés et les formulaires partagés par lien ne doivent pas être indexés.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: ["/admin", "/dossier", "/connexion", "/formulaire"] } };
}
