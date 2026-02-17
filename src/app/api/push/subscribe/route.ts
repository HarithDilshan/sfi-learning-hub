/**
 * app/api/push/subscribe/route.ts
 *
 * Saves a push subscription to Supabase (or a simple JSON file for dev).
 * In production you'd store this in a `push_subscriptions` table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only key

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // If Supabase is configured, persist the subscription
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from("push_subscriptions").upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}