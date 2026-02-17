"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useDemoContext } from "./demo-context";
import { TourOverlay, TourToggleButton } from "./tour-overlay";
import {
  demoEstimateTourSteps,
  demoIntakeTourSteps,
  demoLandingTourSteps,
  demoShowcaseTourSteps,
} from "./tour-steps";

function getStepsForPath(pathname: string) {
  if (pathname === "/demo") return demoLandingTourSteps;
  if (pathname.startsWith("/demo/intake")) return demoIntakeTourSteps;
  if (pathname.startsWith("/demo/estimate")) return demoEstimateTourSteps;
  if (pathname.startsWith("/demo/showcase")) return demoShowcaseTourSteps;
  return [];
}

export function DemoTour() {
  const pathname = usePathname();
  const {
    state,
    nextTourStep,
    prevTourStep,
    completeTour,
    setShowTour,
    toggleTour,
    goToTourStep,
  } = useDemoContext();

  const steps = useMemo(() => getStepsForPath(pathname), [pathname]);
  const isGuided = state.demoMode === "guided";
  const isAutomation = typeof navigator !== "undefined" && navigator.webdriver;

  if (!isGuided || isAutomation || steps.length === 0) return null;

  return (
    <>
      <TourOverlay
        steps={steps}
        currentStep={Math.min(state.currentTourStep, steps.length - 1)}
        onNext={() => {
          if (state.currentTourStep >= steps.length - 1) {
            completeTour();
            return;
          }
          nextTourStep();
        }}
        onPrev={prevTourStep}
        onSkip={completeTour}
        isVisible={state.showTour}
      />

      {!state.showTour && (
        <TourToggleButton
          isVisible={state.showTour}
          onToggle={() => {
            toggleTour();
            goToTourStep(0);
            setShowTour(true);
          }}
          className="fixed right-4 bottom-4 z-20"
        />
      )}
    </>
  );
}
