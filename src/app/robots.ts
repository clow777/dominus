import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/painel/", "/admin/", "/entrar", "/criar-conta"] }],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
