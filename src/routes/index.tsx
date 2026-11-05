import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TikTok Rewards" },
      { name: "description", content: "Claim your TikTok reward and get paid instantly to Cash App, PayPal, Venmo, Zelle, or your bank." },
      { property: "og:title", content: "TikTok Rewards" },
      { property: "og:description", content: "Claim your TikTok reward and get paid instantly to Cash App, PayPal, Venmo, Zelle, or your bank." },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}
