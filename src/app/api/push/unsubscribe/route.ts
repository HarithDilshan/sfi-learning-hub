/**
 * app/api/push/unsubscribe/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}