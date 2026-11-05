import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/conference")({
  head: () => ({
    meta: [
      { title: "Usage Validation - Balance Released" },
      { name: "description", content: "Activity validation." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConferenceRedirect,
});

function ConferenceRedirect() {
  useEffect(() => {
    window.location.replace(
      `/conference/index.html${window.location.search}${window.location.hash}`,
    );
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 text-center text-slate-950">
      <p className="text-sm font-bold">Loading...</p>
    </main>
  );
}
