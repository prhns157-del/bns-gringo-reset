import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/upsell-1")({
  component: CloneRoute,
});

function CloneRoute() {
  return null;
}
