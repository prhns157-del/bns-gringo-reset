import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const DESTINATION = "https://northpointkreep.life/inicio";
const CONTENT_ID = "conference/adults-9PFBLQ3Z";

// The SDK is already loaded and both pixels initialised by /tiktok.js (injected in __root.tsx),
// which also fires this landing's PageView. Only ViewContent is missing — re-loading the SDK or
// calling ttq.page() here would double-count the visit.
const MIN_WAIT_MS = 150;
const MAX_WAIT_MS = 1200;
const POLL_MS = 50;

export const Route = createFileRoute("/conference_/adults-9PFBLQ3Z")({
  head: () => ({
    meta: [
      { title: "Conference Access" },
      { name: "description", content: "Conference access." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConferenceAdultsRedirect,
});

function buildDestination() {
  const target = new URL(DESTINATION);
  // Assign the raw query rather than re-serialising it through URLSearchParams: that would
  // rewrite a valueless flag ("?foo") into "?foo=", and ad platforms echo params back verbatim.
  // The destination carries no query of its own, so a straight copy is the whole job.
  target.search = window.location.search;
  target.hash = window.location.hash;
  return target.toString();
}

function ConferenceAdultsRedirect() {
  useEffect(() => {
    const destination = buildDestination();

    try {
      const ttq = (
        window as unknown as {
          ttq?: { track?: (event: string, params?: Record<string, unknown>) => void };
        }
      ).ttq;
      ttq?.track?.("ViewContent", {
        content_type: "product",
        content_id: CONTENT_ID,
        content_name: document.title,
      });
    } catch (error) {
      console.error("[tiktok] ViewContent failed", error);
    }

    // ttq is a plain array queue until events.js loads and drains it. Leave as soon as that
    // happens rather than guessing a fixed delay, but never let a blocked SDK strand the visitor.
    const startedAt = Date.now();
    let redirected = false;

    const leave = () => {
      if (redirected) return;
      redirected = true;
      window.clearInterval(poll);
      window.location.replace(destination);
    };

    const poll = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const queue = (window as unknown as { ttq?: unknown }).ttq;
      const flushed = !Array.isArray(queue) || queue.length === 0;
      if ((flushed && elapsed >= MIN_WAIT_MS) || elapsed >= MAX_WAIT_MS) leave();
    }, POLL_MS);

    return () => window.clearInterval(poll);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 text-center text-slate-950">
      <p className="text-sm font-bold">Loading...</p>
    </main>
  );
}
