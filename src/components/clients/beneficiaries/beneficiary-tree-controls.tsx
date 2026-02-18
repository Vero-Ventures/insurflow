"use client";

import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface BeneficiaryTreeControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  minZoom?: number;
  maxZoom?: number;
}

export function BeneficiaryTreeControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  minZoom = 0.25,
  maxZoom = 2,
}: BeneficiaryTreeControlsProps) {
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return (
    <div className="bg-background absolute right-4 bottom-4 z-10 flex gap-2 rounded-lg border p-2 shadow-lg">
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        disabled={!canZoomIn}
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        disabled={!canZoomOut}
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <div className="border-border mx-2 w-px border-l" />
      <Button variant="ghost" size="icon" onClick={onFitView} title="Fit View">
        <Maximize2 className="h-4 w-4" />
      </Button>
      <div className="text-muted-foreground flex items-center px-2 text-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
