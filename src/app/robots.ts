import { MetadataRoute } from "next";

// 👇 Change this to your actual Vercel URL or custom domain
const BASE_URL = "https://sfi-learning-hub.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",   // applies to all crawlers: Googlebot, Bingbot, etc.
        allow: "/",       // allow crawling everything by default
        disallow: [
          "/api/",        // never index API routes
          "/profile",     // personal user pages — no SEO value
        ],
      },
    ],
    // This line tells Google exactly where your sitemap is
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}