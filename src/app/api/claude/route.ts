// src/app/api/claude/route.ts
// A thin proxy — the browser calls THIS, which calls Anthropic server-side
// This avoids CORS since the request comes from the server, not the browser

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[/api/claude] Anthropic error:", err);
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/claude] route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}