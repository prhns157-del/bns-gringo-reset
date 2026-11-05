import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/inicio")({
  component: CloneRoute,
});

function CloneRoute() {
  return null;
}
