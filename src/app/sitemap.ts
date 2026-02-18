import { MetadataRoute } from "next";

// 👇 Change this to your actual Vercel URL or custom domain
const BASE_URL = "https://sfi-learning-hub.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // ── STATIC PAGES ───────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/phrases`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/daily`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/review`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/listening`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/sentences`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/skrivning`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/verb`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/berattelser`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/uttal`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/leaderboard`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.6,
    },
  ];

  // ── COURSE LEVEL PAGES ─────────────────────────────────────
  const courseLevels = ["A", "B", "C", "D", "G"];
  const coursePages: MetadataRoute.Sitemap = courseLevels.map((level) => ({
    url: `${BASE_URL}/kurs/${level}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // ── INDIVIDUAL LESSON PAGES ────────────────────────────────
  // Update these IDs to match your actual topic IDs in courseData
  const topicIds: Record<string, string[]> = {
    A: ["a1", "a2", "a3", "a4"],
    B: ["b1", "b2", "b3"],
    C: ["c1", "c2", "c3"],
    D: ["d1", "d2", "d3"],
    G: ["g1", "g2", "g3", "g4"],
  };

  const lessonPages: MetadataRoute.Sitemap = Object.entries(topicIds).flatMap(
    ([level, ids]) =>
      ids.map((id) => ({
        url: `${BASE_URL}/kurs/${level}/${id}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }))
  );

  return [...staticPages, ...coursePages, ...lessonPages];
}