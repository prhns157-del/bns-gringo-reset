import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/historico")({
  component: CloneRoute,
});

function CloneRoute() {
  return null;
}
