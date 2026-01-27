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
  readonly clients: Client[];
  readonly onRowClick: (clientId: string) => void;
}

function getBadgeVariant(
  status: ClientStatus,
): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "draft") return "secondary";
  return "outline";
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
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => onRowClick(client.id)}
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
