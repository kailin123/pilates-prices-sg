"use client";

import { useEffect, useState } from "react";

type StudioOption = { id: string; name: string };
type Status = "idle" | "sending" | "done" | "error";

// Google Form backend (set in .env.local). When configured, the form posts
// straight to Google — no server needed, so this works on static/serverless
// hosting. If unset, it falls back to the local /api/submit-promo route (dev).
const GFORM = {
  action: process.env.NEXT_PUBLIC_GFORM_ACTION,
  studio: process.env.NEXT_PUBLIC_GFORM_ENTRY_STUDIO,
  url: process.env.NEXT_PUBLIC_GFORM_ENTRY_URL,
  offer: process.env.NEXT_PUBLIC_GFORM_ENTRY_OFFER,
};
const useGoogle = Boolean(GFORM.action && GFORM.studio && GFORM.url);

export default function PromoSubmit({ studios }: { studios: StudioOption[] }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setStatus("sending");
    setError("");

    // Honeypot: silently accept (and drop) bot submissions.
    if ((fd.get("company") as string)?.trim()) {
      setStatus("done");
      form.reset();
      return;
    }

    const url = (fd.get("url") as string)?.trim() ?? "";
    if (!/^https?:\/\/\S+$/.test(url)) {
      setStatus("error");
      setError("Please enter a valid link (http/https).");
      return;
    }

    try {
      if (useGoogle) {
        // POST directly to Google Forms. no-cors → opaque response, so we
        // optimistically treat a completed request as success.
        const gf = new FormData();
        gf.append(GFORM.studio!, (fd.get("studio") as string) || "");
        gf.append(GFORM.url!, url);
        if (GFORM.offer) gf.append(GFORM.offer, (fd.get("offer") as string) || "");
        await fetch(GFORM.action!, { method: "POST", mode: "no-cors", body: gf });
        setStatus("done");
        form.reset();
        return;
      }

      // Dev fallback: local review-queue API.
      const res = await fetch("/api/submit-promo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          studio: fd.get("studio"),
          url,
          offer: fd.get("offer"),
          company: fd.get("company"),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("done");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStatus("idle"); }}
        className="rounded-md bg-volt px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-ink transition hover:brightness-110"
      >
        Spotted a deal? Submit a promo →
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border-2 border-line bg-panel p-6 shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Submit a promotion"
          >
            {status === "done" ? (
              <div className="py-6 text-center">
                <p className="font-display text-2xl uppercase tracking-wide text-fg">Thank you ✦</p>
                <p className="mt-2 text-sm text-muted">
                  Your tip is in the review queue. Once it&rsquo;s checked, it&rsquo;ll appear on the studio&rsquo;s card.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-5 rounded-md bg-volt px-5 py-2 text-sm font-bold uppercase tracking-wide text-ink"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-2xl uppercase tracking-wide text-fg">Submit a promo</h2>
                    <p className="mt-1 text-sm text-muted">
                      Seen a deal on a studio&rsquo;s Instagram or site? Drop the link — we&rsquo;ll verify and add it.
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="shrink-0 rounded-full p-1 text-muted hover:text-fg">✕</button>
                </div>

                <form onSubmit={onSubmit} className="mt-5 space-y-3">
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Studio</span>
                    <select name="studio" className="mt-1 w-full rounded-md border-2 border-line bg-ink px-3 py-2 text-sm text-fg outline-none focus:border-volt">
                      <option value="">Select a studio…</option>
                      {studios.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                      <option value="Other / not listed">Other / not listed</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">Link to the promo *</span>
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder="https://instagram.com/p/…"
                      className="mt-1 w-full rounded-md border-2 border-line bg-ink px-3 py-2 text-sm text-fg outline-none focus:border-volt"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted">What&rsquo;s the offer? <span className="normal-case text-muted/70">(optional)</span></span>
                    <textarea
                      name="offer"
                      rows={2}
                      placeholder="e.g. 10 classes for $199 (National Day promo)"
                      className="mt-1 w-full resize-none rounded-md border-2 border-line bg-ink px-3 py-2 text-sm text-fg outline-none focus:border-volt"
                    />
                  </label>

                  {/* Honeypot: hidden from humans */}
                  <input name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

                  {status === "error" && <p className="text-sm text-rose">{error}</p>}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="w-full rounded-md bg-volt py-2.5 text-sm font-bold uppercase tracking-wide text-ink transition hover:brightness-110 disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Submit promo"}
                  </button>
                  <p className="text-center text-[11px] text-muted">
                    Submissions are reviewed before appearing. We don&rsquo;t auto-scrape social media.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
