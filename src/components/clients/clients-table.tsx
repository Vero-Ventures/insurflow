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
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[250px]">Name</TableHead>
          <TableHead className="w-[80px]">Age</TableHead>
          <TableHead className="w-[100px]">Province</TableHead>
          <TableHead className="w-[140px]">Last Updated</TableHead>
          <TableHead className="w-[140px]">Insurance Needs</TableHead>
          <TableHead className="w-[100px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow
            key={client.id}
            className={`cursor-pointer ${
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
            <TableCell className="text-muted-foreground">
              {formatDate(client.updatedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground">--</TableCell>
            <TableCell>
              <Badge variant={getBadgeVariant(client.status)}>
                {client.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
