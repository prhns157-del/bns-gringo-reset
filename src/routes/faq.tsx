import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/faq")({
  component: CloneRoute,
});

function CloneRoute() {
  return null;
}
