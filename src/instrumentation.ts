import { registerObservability } from "@/server/observability/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  await registerObservability();
}
