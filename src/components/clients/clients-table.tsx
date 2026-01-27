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

interface ClientsTableProps {
  readonly clients: (Client & { optimistic?: boolean })[];
  readonly onRowClick: (clientId: string) => void;
}

const badgeVariantMap: Record<
  ClientStatus,
  "default" | "secondary" | "outline"
> = {
  active: "default",
  draft: "secondary",
  archived: "outline",
};

function getBadgeVariant(status: ClientStatus) {
  return badgeVariantMap[status];
}

export function ClientsTable({ clients, onRowClick }: ClientsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Province</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead>Insurance Needs</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className={`hover:bg-muted/50 cursor-pointer ${
                client.optimistic ? "bg-muted/30 animate-pulse opacity-60" : ""
              }`}
              onClick={() => {
                // Prevent clicking on optimistic rows
                if (!client.optimistic) {
                  onRowClick(client.id);
                }
              }}
            >
              <TableCell className="font-medium">
                {client.firstName} {client.lastName}
              </TableCell>
              <TableCell>{calculateAge(client.dateOfBirth)}</TableCell>
              <TableCell className="uppercase">{client.province}</TableCell>
              <TableCell>{formatDate(client.updatedAt)}</TableCell>
              <TableCell className="text-muted-foreground">N/A</TableCell>
              <TableCell>
                <Badge variant={getBadgeVariant(client.status)}>
                  {client.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
