/**
 * app/api/push/send/route.ts
 *
 * Send a push notification to all (or specific) subscribers.
 * Call this from a cron job, server action, or admin panel.
 *
 * Example cron with Vercel (vercel.json):
 * {
 *   "crons": [{ "path": "/api/push/send", "schedule": "0 9 * * *" }]
 * }
 *
 * POST body (optional, defaults to daily reminder):
 * {
 *   "title": "...",
 *   "body": "...",
 *   "url": "/daily",
 *   "secret": "<CRON_SECRET env var>"
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET;

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:admin@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  // Basic auth for cron / manual triggers
  const body = await req.json().catch(() => ({}));
  if (CRON_SECRET && body.secret !== CRON_SECRET) {
    // Also accept Bearer token in Authorization header
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const payload = JSON.stringify({
    title: body.title || "Lär dig Svenska 🇸🇪",
    body: body.body || "Dags att öva lite svenska idag! Klicka för att börja.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    url: body.url || "/daily",
    tag: "svenska-daily",
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (subs || []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Clean up expired subscriptions (410 Gone)
  const expiredEndpoints = (subs || []).filter(
    (_, i) =>
      results[i].status === "rejected" &&
      (results[i] as PromiseRejectedResult).reason?.statusCode === 410
  );
  if (expiredEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints.map((s) => s.endpoint));
  }

  return NextResponse.json({ sent, failed, total: (subs || []).length });
}