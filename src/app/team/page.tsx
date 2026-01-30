import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export default function TeamPage() {
  return (
    <main className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center" size="sm">
        <CardHeader>
          <div className="bg-muted mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
            <Construction className="text-muted-foreground h-6 w-6" />
          </div>
          <CardTitle>Team Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary">Coming Soon</Badge>
          <p className="text-muted-foreground text-sm">
            Team collaboration features are under development. This will allow
            you to invite team members, manage roles, and share client
            portfolios.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
