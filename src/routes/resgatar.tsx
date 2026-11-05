import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/resgatar")({
  component: CloneRoute,
});

function CloneRoute() {
  return null;
}
