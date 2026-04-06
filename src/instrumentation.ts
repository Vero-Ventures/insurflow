export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { registerObservability } = await import("@/server/observability/otel");
  await registerObservability();
}
