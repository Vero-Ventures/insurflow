import type { ReactNode } from "react";
import { DemoProvider } from "@/components/demo/demo-context";
import { DemoNav } from "@/components/demo/demo-nav";

interface DemoLayoutProps {
  children: ReactNode;
}

/**
 * Layout for all demo pages.
 * Provides demo context and navigation.
 */
export default function DemoLayout({ children }: DemoLayoutProps) {
  return (
    <DemoProvider>
      <div className="min-h-screen">
        <DemoNav />
        {children}
      </div>
    </DemoProvider>
  );
}
