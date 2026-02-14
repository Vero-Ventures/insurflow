"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Client, ClientStatus } from "@/types/client";
import { calculateAge, formatDate } from "@/lib/client-utils";
import { ChevronRight, User } from "lucide-react";

interface ClientsTableProps {
  readonly clients: (Client & { optimistic?: boolean })[];
  readonly onRowClick: (clientId: string) => void;
}

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

function getStatusConfig(status: ClientStatus) {
  return statusConfig[status];
}

// Generate initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Generate consistent color based on name
function getAvatarColor(firstName: string, lastName: string): string {
  const colors = [
    "from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]", // Navy
    "from-[oklch(0.55_0.15_200)] to-[oklch(0.45_0.12_220)]", // Teal
    "from-[oklch(0.6_0.14_170)] to-[oklch(0.5_0.12_190)]", // Teal-green
    "from-[oklch(0.696_0.17_162.48)] to-[oklch(0.55_0.14_175)]", // Emerald
    "from-[oklch(0.5_0.1_280)] to-[oklch(0.4_0.08_260)]", // Purple-blue
  ] as const;
  const defaultColor = "from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]";
  const hash =
    (firstName.charCodeAt(0) + lastName.charCodeAt(0)) % colors.length;
  return colors[hash] ?? defaultColor;
}

export function ClientsTable({ clients, onRowClick }: ClientsTableProps) {
  return (
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
        {clients.map((client, index) => {
          const config = getStatusConfig(client.status);
          const initials = getInitials(client.firstName, client.lastName);
          const avatarColor = getAvatarColor(client.firstName, client.lastName);

          return (
            <TableRow
              key={client.id}
              className={`group border-border/40 cursor-pointer transition-colors ${
                client.optimistic
                  ? "bg-primary/5 animate-pulse opacity-60"
                  : "hover:bg-muted/50"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => {
                if (!client.optimistic) {
                  onRowClick(client.id);
                }
              }}
            >
              {/* Client Name with Avatar */}
              <TableCell>
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white ${avatarColor}`}
                  >
                    {client.optimistic ? (
                      <User className="h-4 w-4 opacity-60" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <p className="text-foreground font-medium">
                      {client.firstName} {client.lastName}
                    </p>
                    {client.optimistic && (
                      <p className="text-muted-foreground text-xs">
                        Creating...
                      </p>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Age */}
              <TableCell>
                <span className="font-mono text-sm tabular-nums">
                  {calculateAge(client.dateOfBirth)}
                </span>
              </TableCell>

              {/* State */}
              <TableCell>
                <span className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
                  {client.state}
                </span>
              </TableCell>

              {/* Last Updated - hidden on mobile */}
              <TableCell className="hidden md:table-cell">
                <span className="text-muted-foreground text-sm">
                  {formatDate(client.updatedAt)}
                </span>
              </TableCell>

              {/* Insurance Needs - hidden on mobile/tablet */}
              <TableCell className="hidden lg:table-cell">
                <span className="text-muted-foreground/60 text-sm">
                  Not calculated
                </span>
              </TableCell>

              {/* Status Badge */}
              <TableCell>
                <Badge
                  variant={config.variant}
                  className={`${config.className} text-xs font-medium`}
                >
                  {config.label}
                </Badge>
              </TableCell>

              {/* Arrow indicator */}
              <TableCell>
                <ChevronRight className="text-muted-foreground/40 group-hover:text-primary h-4 w-4 transition-all group-hover:translate-x-0.5" />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
