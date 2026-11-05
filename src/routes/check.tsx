import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/check")({
  head: () => ({
    meta: [
      { title: "Security Check" },
      { name: "description", content: "Security verification." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckRedirect,
});

function CheckRedirect() {
  useEffect(() => {
    window.location.replace(`/check/index.html${window.location.search}${window.location.hash}`);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 text-center text-slate-950">
      <p className="text-sm font-bold">Loading...</p>
    </main>
  );
}
