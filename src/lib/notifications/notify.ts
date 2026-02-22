/**
 * notify.ts
 *
 * Tiny helper you can import anywhere in the app to fire a local
 * notification without needing the full hook.
 *
 * Examples:
 *   notify.success("Bra jobbat!", "Du fick 90% på Kurs A");
 *   notify.streak(7);
 *   notify.xp(500);
 *   notify.badge("💯", "Full pott", "Du fick 100% på en övning!");
 *   notify.custom("👂 Ny lektion", "Lyssna-övning upplåst", { url: "/listening" });
 */

async function send(
  title: string,
  body: string,
  tag = "in-app",
  url = "/",
  silent = true
) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag,
      renotify: true,
      silent,
      data: { url },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  } catch {
    // Silently fail — never break the app for a notification
  }
}

export const notify = {
  /** Generic success — e.g. after completing a quiz */
  success: (title: string, body: string, url = "/") =>
    send(`✅ ${title}`, body, "success", url),

  /** Perfect score on a quiz */
  perfect: (topicName?: string) =>
    send(
      "💯 Perfekt!",
      topicName
        ? `100% på ${topicName}! Fantastiskt jobbat.`
        : "Du fick 100% — fantastiskt jobbat!",
      "quiz-perfect",
      "/profile"
    ),

  /** Good score (80%+) on a quiz */
  goodScore: (pct: number, url = "/review") =>
    send(
      "🎉 Bra jobbat!",
      `Du fick ${pct}% — ett starkt resultat!`,
      "quiz-done",
      url
    ),

  /** Streak milestone */
  streak: (days: number) => {
    const emoji = days >= 30 ? "🏆" : days >= 14 ? "🔥" : days >= 7 ? "⚡" : "🔥";
    return send(
      `${emoji} ${days} dagars streak!`,
      days === 1
        ? "Bra start — kom tillbaka imorgon!"
        : `Imponerande! ${days} dagar i rad.`,
      "streak",
      "/daily"
    );
  },

  /** XP milestone */
  xp: (total: number) =>
    send(
      `⭐ ${total} XP uppnått!`,
      `Du har tjänat ${total} XP. Fortsätt öva för att nå nästa nivå!`,
      "xp-milestone",
      "/profile"
    ),

  /** Badge unlocked */
  badge: (icon: string, nameSv: string, description: string) =>
    send(
      `${icon} Nytt märke upplåst!`,
      `${nameSv} — ${description}`,
      "badge",
      "/profile"
    ),

  /** Completely custom notification */
  custom: (title: string, body: string, opts?: { tag?: string; url?: string; silent?: boolean }) =>
    send(title, body, opts?.tag ?? "custom", opts?.url ?? "/", opts?.silent ?? true),
};