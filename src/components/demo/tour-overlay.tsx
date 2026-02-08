"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  /** CSS selector for the target element */
  target: string;
  /** Short title for the tooltip */
  title: string;
  /** Explanation content */
  content: string;
  /** Tooltip placement relative to target */
  placement?: "top" | "bottom" | "left" | "right";
  /** Optional action hint (e.g., "Click the button to continue") */
  actionHint?: string;
}

interface TourOverlayProps {
  steps: TourStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isVisible: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const TOOLTIP_OFFSET = 12;
const SPOTLIGHT_PADDING = 8;

// Client-side mounting detection
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
}

export function TourOverlay({
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  isVisible,
}: TourOverlayProps) {
  const mounted = useIsMounted();
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(
    null,
  );
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const calculatePositions = useCallback(() => {
    if (!step || !isVisible) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // Element not found, hide spotlight
      setSpotlightRect(null);
      return;
    }

    const rect = targetElement.getBoundingClientRect();

    // Set spotlight position (viewport-relative, with padding)
    // getBoundingClientRect() already returns viewport-relative coordinates
    setSpotlightRect({
      top: rect.top - SPOTLIGHT_PADDING,
      left: rect.left - SPOTLIGHT_PADDING,
      width: rect.width + SPOTLIGHT_PADDING * 2,
      height: rect.height + SPOTLIGHT_PADDING * 2,
    });

    // Calculate tooltip position (also viewport-relative for fixed positioning)
    const preferredPlacement = step.placement ?? "bottom";
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 320;
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 150;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let placement = preferredPlacement;
    let top = 0;
    let left = 0;

    // Calculate position based on placement
    switch (placement) {
      case "bottom":
        top = rect.bottom + TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        // Check if it fits
        if (rect.bottom + tooltipHeight + TOOLTIP_OFFSET > viewportHeight) {
          placement = "top";
          top = rect.top - tooltipHeight - TOOLTIP_OFFSET;
        }
        break;
      case "top":
        top = rect.top - tooltipHeight - TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        if (top < 0) {
          placement = "bottom";
          top = rect.bottom + TOOLTIP_OFFSET;
        }
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - TOOLTIP_OFFSET;
        if (left < 0) {
          placement = "right";
          left = rect.right + TOOLTIP_OFFSET;
        }
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + TOOLTIP_OFFSET;
        if (left + tooltipWidth > viewportWidth) {
          placement = "left";
          left = rect.left - tooltipWidth - TOOLTIP_OFFSET;
        }
        break;
    }

    // Ensure tooltip stays within viewport bounds
    left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

    setTooltipPosition({ top, left, placement });

    // Scroll target into view if needed
    if (rect.top < 80 || rect.bottom > viewportHeight - 80) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [step, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    // Initial calculation
    const timer = setTimeout(calculatePositions, 100);

    // Recalculate on scroll/resize
    window.addEventListener("scroll", calculatePositions);
    window.addEventListener("resize", calculatePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", calculatePositions);
      window.removeEventListener("resize", calculatePositions);
    };
  }, [calculatePositions, isVisible, currentStep]);

  if (!mounted || !isVisible || !step) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {/* Overlay with spotlight cutout */}
      <svg
        className="pointer-events-auto absolute inset-0 h-full w-full"
        onClick={(e) => {
          // Allow clicking through to highlighted element
          if (spotlightRect) {
            // Use viewport-relative coordinates (clientX/clientY) to match
            // spotlightRect, which is based on getBoundingClientRect()
            const clickX = e.clientX;
            const clickY = e.clientY;
            const inSpotlight =
              clickX >= spotlightRect.left &&
              clickX <= spotlightRect.left + spotlightRect.width &&
              clickY >= spotlightRect.top &&
              clickY <= spotlightRect.top + spotlightRect.height;
            if (inSpotlight) {
              // Forward the click to the underlying element
              const svgElement = e.currentTarget as SVGSVGElement;
              const previousPointerEvents = svgElement.style.pointerEvents;
              svgElement.style.pointerEvents = "none";
              const underlyingElement = document.elementFromPoint(
                clickX,
                clickY,
              ) as HTMLElement | null;
              svgElement.style.pointerEvents = previousPointerEvents;
              if (underlyingElement) {
                underlyingElement.click();
              }
              return;
            }
          }
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.left}
                y={spotlightRect.top}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {spotlightRect && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-white/30"
          style={{
            top: spotlightRect.top,
            left: spotlightRect.left,
            width: spotlightRect.width,
            height: spotlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={cn(
          "pointer-events-auto absolute w-80 rounded-xl border border-white/10 bg-[oklch(0.2_0.02_250)] p-4 shadow-2xl backdrop-blur-sm",
          "animate-in fade-in-0 zoom-in-95 duration-200",
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onSkip}
          className="absolute top-2 right-2 rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white/80"
          aria-label="Close tour"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h4 className="font-display mb-1.5 text-base font-semibold text-white">
            {step.title}
          </h4>
          <p className="text-sm leading-relaxed text-white/70">
            {step.content}
          </p>
          {step.actionHint && (
            <p className="mt-2 text-xs font-medium text-emerald-400">
              {step.actionHint}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-xs text-white/50">
            {currentStep + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrev}
                className="h-8 gap-1 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={onNext}
              className="bg-emerald hover:bg-emerald/90 h-8 gap-1 text-white"
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Button to toggle tour visibility
 */
interface TourToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
}

export function TourToggleButton({
  isVisible,
  onToggle,
  className,
}: TourToggleButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={cn(
        "gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10",
        className,
      )}
    >
      {isVisible ? (
        <>
          <EyeOff className="h-4 w-4" />
          Hide Guide
        </>
      ) : (
        <>
          <Eye className="h-4 w-4" />
          Show Guide
        </>
      )}
    </Button>
  );
}
