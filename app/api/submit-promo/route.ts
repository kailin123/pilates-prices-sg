import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

/*
 * Receives crowd-sourced promo tips and appends them to a review queue at
 * data/submissions.json. Nothing goes live automatically — the owner reviews
 * each tip and, if good, runs `npm run add-promo` to publish it.
 *
 * NOTE (deployment): this writes to the local filesystem, which works in dev and
 * on a persistent host. On read-only serverless platforms (e.g. Vercel) swap the
 * write below for a form service (Formspree/Tally), a DB/KV, or a GitHub issue.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE = join(process.cwd(), "data", "submissions.json");
const MAX = { url: 500, offer: 400, studio: 80, email: 160 };

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: bots fill hidden fields; humans don't.
  if (clean(body.company, 100)) {
    return NextResponse.json({ ok: true });
  }

  const url = clean(body.url, MAX.url);
  const offer = clean(body.offer, MAX.offer);
  const studio = clean(body.studio, MAX.studio);
  const email = clean(body.email, MAX.email);

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ ok: false, error: "Please provide a valid link (http/https)." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "That email doesn't look right." }, { status: 400 });
  }

  const entry = {
    studio: studio || "(unspecified)",
    url,
    offer,
    email,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };

  try {
    const list = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, "utf8")) : [];
    list.push(entry);
    writeFileSync(QUEUE, JSON.stringify(list, null, 2) + "\n");
  } catch {
    return NextResponse.json({ ok: false, error: "Couldn't save right now — please try later." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
