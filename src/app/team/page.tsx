import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction } from "lucide-react";

export default function TeamPage() {
  return (
    <main className="bg-muted/30 flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Construction className="text-muted-foreground h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">Team Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge variant="secondary">Coming Soon</Badge>
          <p className="text-muted-foreground">
            Team collaboration features are under development. This will allow
            you to invite team members, manage roles, and share client
            portfolios.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
