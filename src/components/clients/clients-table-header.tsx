import { CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface ClientsTableHeaderProps {
  readonly searchQuery: string;
  readonly onSearchChange: (value: string) => void;
}

export function ClientsTableHeader({
  searchQuery,
  onSearchChange,
}: ClientsTableHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <CardTitle>Client List</CardTitle>
      <div className="w-full sm:w-72">
        <Input
          type="search"
          placeholder="Search clients by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full"
        />
      </div>
    </div>
  );
}
