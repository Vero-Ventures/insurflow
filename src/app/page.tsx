import { AuthStatus } from "@/components/auth-status";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
            InsurFlow
          </h1>
          <p className="max-w-md text-center text-lg text-slate-300">
            AI-powered financial needs analysis for life insurance advisors
          </p>
        </div>

        <AuthStatus />
      </div>
    </main>
  );
}
