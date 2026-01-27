import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted mb-4 rounded-full p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="text-muted-foreground h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold">No Clients Found</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{message}</p>
      {showSeedButton && (
        <Button onClick={onSeed} disabled={isSeeding}>
          {isSeeding ? "Seeding..." : "Seed Test Clients"}
        </Button>
      )}
    </div>
  );
}
