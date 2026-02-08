"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Home,
  Sparkles,
  UserPlus,
  Users,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DemoSegment = "landing" | "portfolio" | "add-client" | "client";

interface SegmentInfo {
  path: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const SEGMENTS: Record<DemoSegment, SegmentInfo> = {
  landing: {
    path: "/demo",
    label: "Demo Overview",
    shortLabel: "Start",
    icon: <Home className="h-4 w-4" />,
  },
  portfolio: {
    path: "/demo/portfolio",
    label: "Client Portfolio",
    shortLabel: "Portfolio",
    icon: <Users className="h-4 w-4" />,
  },
  "add-client": {
    path: "/demo/add-client",
    label: "Add New Client",
    shortLabel: "Add Client",
    icon: <UserPlus className="h-4 w-4" />,
  },
  client: {
    path: "/demo/client",
    label: "Client Analysis",
    shortLabel: "Analysis",
    icon: <FileText className="h-4 w-4" />,
  },
};

const SEGMENT_ORDER: DemoSegment[] = [
  "landing",
  "portfolio",
  "add-client",
  "client",
];

function getCurrentSegment(pathname: string): DemoSegment {
  if (pathname === "/demo") return "landing";
  if (pathname.startsWith("/demo/portfolio")) return "portfolio";
  if (pathname.startsWith("/demo/add-client")) return "add-client";
  if (pathname.startsWith("/demo/client")) return "client";
  return "landing";
}

function getSegmentIndex(segment: DemoSegment): number {
  return SEGMENT_ORDER.indexOf(segment);
}

interface DemoNavProps {
  className?: string;
}

export function DemoNav({ className }: DemoNavProps) {
  const pathname = usePathname();
  const currentSegment = getCurrentSegment(pathname);
  const currentIndex = getSegmentIndex(currentSegment);

  const prevSegment = currentIndex > 0 ? SEGMENT_ORDER[currentIndex - 1] : null;
  const nextSegment =
    currentIndex < SEGMENT_ORDER.length - 1
      ? SEGMENT_ORDER[currentIndex + 1]
      : null;

  // Don't show nav on landing page
  if (currentSegment === "landing") return null;

  return (
    <div
      className={cn(
        "border-border/40 bg-background/80 sticky top-14 z-40 border-b backdrop-blur-sm",
        className,
      )}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Left: Back / Exit */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Exit Demo</span>
              </Link>
            </Button>
            <Badge
              variant="outline"
              className="border-emerald/30 bg-emerald/5 text-emerald hidden items-center gap-1.5 sm:flex"
            >
              <Sparkles className="h-3 w-3" />
              Demo Mode
            </Badge>
          </div>

          {/* Center: Progress Steps */}
          <div className="hidden items-center gap-1 md:flex">
            {SEGMENT_ORDER.slice(1).map((segment, index) => {
              const info = SEGMENTS[segment];
              const segmentIndex = index + 1; // Skip landing
              const isCurrent = segment === currentSegment;
              const isCompleted = currentIndex > segmentIndex;
              const isAccessible = segmentIndex <= currentIndex;

              return (
                <div key={segment} className="flex items-center">
                  {index > 0 && (
                    <div
                      className={cn(
                        "mx-1 h-px w-6",
                        isCompleted ? "bg-emerald" : "bg-border",
                      )}
                    />
                  )}
                  <Link
                    href={isAccessible ? info.path : "#"}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                      isCurrent && "bg-primary/10 text-primary font-medium",
                      isCompleted &&
                        !isCurrent &&
                        "text-emerald hover:bg-emerald/10",
                      !isCurrent &&
                        !isCompleted &&
                        "text-muted-foreground cursor-not-allowed opacity-50",
                    )}
                    onClick={(e) => {
                      if (!isAccessible) e.preventDefault();
                    }}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                        isCurrent && "bg-primary text-primary-foreground",
                        isCompleted && !isCurrent && "bg-emerald text-white",
                        !isCurrent &&
                          !isCompleted &&
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted ? "✓" : segmentIndex}
                    </span>
                    <span className="hidden lg:inline">{info.shortLabel}</span>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Right: Navigation Buttons */}
          <div className="flex items-center gap-2">
            {prevSegment && (
              <Button variant="outline" size="sm" asChild className="gap-1">
                <Link href={SEGMENTS[prevSegment].path}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Link>
              </Button>
            )}
            {nextSegment ? (
              <Button
                size="sm"
                asChild
                className="bg-emerald hover:bg-emerald/90 gap-1"
              >
                <Link href={SEGMENTS[nextSegment].path}>
                  <span className="hidden sm:inline">Next</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                asChild
                className="bg-primary hover:bg-primary/90 gap-1"
              >
                <Link href="/auth/sign-up">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile-friendly progress indicator
 */
export function DemoProgress() {
  const pathname = usePathname();
  const currentSegment = getCurrentSegment(pathname);
  const currentIndex = getSegmentIndex(currentSegment);

  // Don't show on landing
  if (currentSegment === "landing") return null;

  const totalSteps = SEGMENT_ORDER.length - 1; // Exclude landing
  const currentStep = currentIndex; // 1-indexed for display

  return (
    <div className="flex items-center gap-2 md:hidden">
      <span className="text-muted-foreground text-sm">
        Step {currentStep} of {totalSteps}
      </span>
      <div className="bg-border flex h-1.5 w-20 overflow-hidden rounded-full">
        <div
          className="bg-emerald transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}
