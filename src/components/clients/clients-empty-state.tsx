import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface ClientsEmptyStateProps {
  readonly message: string;
  readonly showSeedButton?: boolean;
  readonly onSeed?: () => void;
  readonly isSeeding?: boolean;
}

export function ClientsEmptyState({
  message,
  showSeedButton,
  onSeed,
  isSeeding,
}: ClientsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
        <Users className="text-muted-foreground h-6 w-6" />
      </div>
      <h3 className="mb-1 text-sm font-medium">No Clients Found</h3>
      <p className="text-muted-foreground mb-3 max-w-xs text-xs">{message}</p>
      {showSeedButton && (
        <Button onClick={onSeed} disabled={isSeeding} size="sm">
          {isSeeding ? "Seeding..." : "Seed Test Clients"}
        </Button>
      )}
    </div>
  );
}
