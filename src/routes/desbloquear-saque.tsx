import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/desbloquear-saque")({
  component: UnlockScreen,
});

function UnlockScreen() {
  useEffect(() => {
    window.location.replace("/confirmar-saque" + window.location.search);
  }, []);

  return null;
}
