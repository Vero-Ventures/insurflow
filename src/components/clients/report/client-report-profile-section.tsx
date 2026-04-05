import { Calendar, Cigarette, Heart, MapPin, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@/types/client";
import { calculateAge, formatDate } from "@/lib/client-utils";
import { ClientReportSection } from "./client-report-section";

interface ClientReportProfileSectionProps {
  client: Client;
}

export function ClientReportProfileSection({
  client,
}: ClientReportProfileSectionProps) {
  return (
    <ClientReportSection
      title="Client Profile"
      description="Personal and demographic information"
      icon={<User className="text-primary h-5 w-5" />}
    >
      <div className="grid gap-6 md:grid-cols-3 print:grid-cols-3">
        <div className="flex items-start gap-3">
          <Calendar className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div>
            <p className="text-muted-foreground text-sm">Age</p>
            <p className="font-medium">
              {calculateAge(client.dateOfBirth)} years
              <span className="text-muted-foreground ml-1 text-sm font-normal">
                (DOB: {formatDate(client.dateOfBirth)})
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div>
            <p className="text-muted-foreground text-sm">State</p>
            <p className="font-medium tracking-wide uppercase">
              {client.state}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div>
            <p className="text-muted-foreground text-sm">Sex</p>
            <p className="font-medium">
              {client.sex === "M"
                ? "Male"
                : client.sex === "F"
                  ? "Female"
                  : "Not specified"}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Cigarette className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div>
            <p className="text-muted-foreground text-sm">Smoker Status</p>
            <Badge
              variant={client.smoker ? "destructive" : "outline"}
              className={
                client.smoker
                  ? ""
                  : "border-emerald/30 bg-emerald/5 text-emerald"
              }
            >
              {client.smoker ? "Smoker" : "Non-Smoker"}
            </Badge>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Heart className="text-muted-foreground mt-0.5 h-4 w-4" />
          <div>
            <p className="text-muted-foreground text-sm">Health Rating</p>
            <Badge variant="outline" className="capitalize">
              {client.healthRating || "Standard"}
            </Badge>
          </div>
        </div>

        {client.hasSpouse ? (
          <div className="flex items-start gap-3">
            <User className="text-muted-foreground mt-0.5 h-4 w-4" />
            <div>
              <p className="text-muted-foreground text-sm">Spouse Age</p>
              <p className="font-medium">
                {client.spouseAge
                  ? `${client.spouseAge} years`
                  : "Not specified"}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </ClientReportSection>
  );
}
