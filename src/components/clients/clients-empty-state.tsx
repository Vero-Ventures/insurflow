import { Button } from "@/components/ui/button";
import { Users, Plus, Sparkles } from "lucide-react";

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
      {/* Decorative icon with gradient background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[oklch(0.35_0.08_250_/_0.15)] to-[oklch(0.696_0.17_162.48_/_0.1)] blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[oklch(0.35_0.08_250)] to-[oklch(0.45_0.1_230)]">
          <Users className="h-7 w-7 text-white" />
        </div>
      </div>

      <h3 className="font-display text-foreground mb-2 text-xl font-semibold tracking-tight">
        No Clients Yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm text-sm leading-relaxed">
        {message}
      </p>

      {showSeedButton && (
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            onClick={onSeed}
            disabled={isSeeding}
            variant="outline"
            className="border-border/60 gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isSeeding ? "Generating..." : "Generate Demo Clients"}
          </Button>
          <span className="text-muted-foreground/60 text-xs">or</span>
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Plus className="h-4 w-4" />
            Create your first client above
          </p>
        </div>
      )}
    </div>
  );
}
