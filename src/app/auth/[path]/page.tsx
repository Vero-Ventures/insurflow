import { AuthView } from "@daveyplate/better-auth-ui";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] w-full items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <AuthView
          path={path}
          classNames={{
            base: "w-full shadow-sm border bg-card",
          }}
        />
      </div>
    </main>
  );
}
