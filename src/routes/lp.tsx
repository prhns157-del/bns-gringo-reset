import { createFileRoute, useRouterState } from "@tanstack/react-router";

export const Route = createFileRoute("/lp")({
  head: () => ({
    meta: [
      { title: "Task Partners | Partner Review Workspace" },
      {
        name: "description",
        content:
          "Task Partners is a modern workspace for partner review activities, digital resources, activity tracking, account management, and support.",
      },
    ],
  }),
  component: LpRoute,
});

function LpRoute() {
  const locationSuffix = useRouterState({
    select: (state) => `${state.location.searchStr}${state.location.hash}`,
  });

  return (
    <iframe
      src={`/lp-page/index.html${locationSuffix}`}
      title="Task Partners"
      style={{
        width: "100%",
        minHeight: "100dvh",
        border: 0,
        display: "block",
        background: "#F8FAFC",
      }}
    />
  );
}
