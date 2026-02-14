"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";
import { demoClients, demoInsuranceResult } from "@/lib/demo-data";
import { calculateAge, formatDate, formatCurrency } from "@/lib/client-utils";
import { useDemoContext } from "@/components/demo/demo-context";
import { TourOverlay } from "@/components/demo/tour-overlay";
import { portfolioTourSteps } from "@/components/demo/tour-steps";
import type { ClientStatus } from "@/types/client";

const statusConfig: Record<
  ClientStatus,
  {
    variant: "default" | "secondary" | "outline";
    className: string;
    label: string;
  }
> = {
  active: {
    variant: "default",
    className:
      "bg-emerald/10 text-emerald border-emerald/20 hover:bg-emerald/15",
    label: "Active",
  },
  draft: {
    variant: "secondary",
    className:
      "bg-primary/5 text-primary/70 border-primary/10 hover:bg-primary/10",
    label: "Draft",
  },
  archived: {
    variant: "outline",
    className: "bg-muted/50 text-muted-foreground border-border",
    label: "Archived",
  },
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getAvatarColor(firstName: string, lastName: string): string {
  const colors = [
    "from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]",
    "from-[oklch(0.55_0.15_200)] to-[oklch(0.45_0.12_220)]",
    "from-[oklch(0.6_0.14_170)] to-[oklch(0.5_0.12_190)]",
    "from-[oklch(0.696_0.17_162.48)] to-[oklch(0.55_0.14_175)]",
    "from-[oklch(0.5_0.1_280)] to-[oklch(0.4_0.08_260)]",
  ] as const;
  const hash =
    (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
  return colors[hash] ?? colors[0];
}

/**
 * Demo portfolio page showing the client list experience.
 */
export default function DemoPortfolioPage() {
  const router = useRouter();
  const { state, nextTourStep, prevTourStep } = useDemoContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNextStepTooltip, setShowNextStepTooltip] = useState(false);

  // Filter clients based on search
  const filteredClients = demoClients.filter((client) => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Stats for the dashboard
  const stats = {
    totalClients: demoClients.length,
    activeClients: demoClients.filter((c) => c.status === "active").length,
    recentlyUpdated: demoClients.filter((c) => {
      const updated = new Date(c.updatedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return updated > weekAgo;
    }).length,
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.06)] to-transparent blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-[oklch(0.696_0.17_162.48_/_0.04)] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 lg:px-8">
        {/* Header */}
        <div
          className="animate-fade-up mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          data-tour="portfolio-header"
        >
          <div>
            <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight lg:text-3xl">
              Client Portfolio
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and track all your client analyses in one place
            </p>
          </div>
          <div className="relative">
            {/* Post-tour tooltip - shows after tour completes */}
            {showNextStepTooltip && (
              <div className="absolute top-full left-0 z-[100] mt-2 sm:right-0 sm:left-auto">
                <div className="bg-foreground text-background relative rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap shadow-lg">
                  Try adding a new client
                  {/* Tooltip arrow - points up */}
                  <div className="bg-foreground absolute -top-1.5 left-4 h-3 w-3 rotate-45 sm:right-4 sm:left-auto" />
                </div>
              </div>
            )}
            <Button
              asChild
              className="bg-emerald hover:bg-emerald/90 gap-2"
              data-tour="new-client-button"
            >
              <Link href="/demo/add-client">
                <Plus className="h-4 w-4" />
                New Client
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="animate-fade-up animation-delay-100 mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-border/60 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Users className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Total Clients</p>
                <p className="text-foreground text-2xl font-semibold">
                  {stats.totalClients}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-border/60 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-emerald/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <TrendingUp className="text-emerald h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Active</p>
                <p className="text-foreground text-2xl font-semibold">
                  {stats.activeClients}
                </p>
              </div>
            </div>
          </Card>
          <Card className="border-border/60 p-5">
            <div className="flex items-center gap-3">
              <div className="bg-chart-3/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Clock className="text-chart-3 h-5 w-5" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">
                  Updated This Week
                </p>
                <p className="text-foreground text-2xl font-semibold">
                  {stats.recentlyUpdated}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search */}
        <div
          className="animate-fade-up animation-delay-150 mb-6"
          data-tour="search-clients"
        >
          <div className="relative max-w-md">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border/60 pl-10"
            />
          </div>
        </div>

        {/* Clients Table */}
        <Card className="animate-fade-up animation-delay-200 border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-muted-foreground w-[180px] min-w-[180px] font-medium sm:w-[200px] md:w-[240px] lg:w-[280px]">
                  Client
                </TableHead>
                <TableHead className="text-muted-foreground w-12 font-medium">
                  Age
                </TableHead>
                <TableHead className="text-muted-foreground w-16 font-medium">
                  State
                </TableHead>
                <TableHead className="text-muted-foreground hidden w-24 font-medium md:table-cell">
                  Updated
                </TableHead>
                <TableHead className="text-muted-foreground hidden w-28 font-medium lg:table-cell">
                  Insurance Needs
                </TableHead>
                <TableHead className="text-muted-foreground w-20 font-medium">
                  Status
                </TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client, index) => {
                const config = statusConfig[client.status];
                const initials = getInitials(client.firstName, client.lastName);
                const avatarColor = getAvatarColor(
                  client.firstName,
                  client.lastName,
                );
                // Show calculated value for Alex Thompson (first client)
                const insuranceNeeds =
                  client.id === "demo-client-001"
                    ? formatCurrency(demoInsuranceResult.totalInsuranceNeeds)
                    : null;

                return (
                  <TableRow
                    key={client.id}
                    className="group border-border/40 hover:bg-muted/50 cursor-pointer transition-colors"
                    data-tour={index === 0 ? "client-row" : undefined}
                    onClick={() => {
                      // Navigate to client detail in demo
                      router.push("/demo/client");
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white ${avatarColor}`}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {client.firstName} {client.lastName}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm tabular-nums">
                        {calculateAge(client.dateOfBirth)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                        {client.state}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-muted-foreground text-sm">
                        {formatDate(client.updatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {insuranceNeeds ? (
                        <span className="text-emerald font-currency text-sm font-medium">
                          {insuranceNeeds}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-sm">
                          Not calculated
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={config.variant}
                        className={`${config.className} text-xs font-medium`}
                      >
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="text-muted-foreground/40 group-hover:text-primary h-4 w-4 transition-all group-hover:translate-x-0.5" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Tour Overlay */}
      <TourOverlay
        steps={portfolioTourSteps}
        currentStep={state.currentTourStep}
        onNext={() => {
          if (state.currentTourStep >= portfolioTourSteps.length - 1) {
            setShowNextStepTooltip(true);
          } else {
            nextTourStep();
          }
        }}
        onPrev={prevTourStep}
        onSkip={() => setShowNextStepTooltip(true)}
        isVisible={state.showTour && !showNextStepTooltip}
      />
    </div>
  );
}
