"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type DemoSegment = "landing" | "portfolio" | "add-client" | "client";

interface DemoState {
  currentSegment: DemoSegment;
  currentTourStep: number;
  hasCompletedClientCreation: boolean;
  showTour: boolean;
  tourCompletedForSegment: DemoSegment | null;
  isTransitioning: boolean;
}

interface DemoContextValue {
  state: DemoState;
  nextTourStep: () => void;
  prevTourStep: () => void;
  goToTourStep: (step: number) => void;
  resetTour: () => void;
  toggleTour: () => void;
  setShowTour: (show: boolean) => void;
  completeTour: () => void;
  simulateClientCreation: () => void;
  setCurrentSegment: (segment: DemoSegment) => void;
  setIsTransitioning: (transitioning: boolean) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

const SEGMENT_ORDER: DemoSegment[] = [
  "landing",
  "portfolio",
  "add-client",
  "client",
];

export function getSegmentIndex(segment: DemoSegment): number {
  return SEGMENT_ORDER.indexOf(segment);
}

export function getNextSegment(current: DemoSegment): DemoSegment | null {
  const index = getSegmentIndex(current);
  return index < SEGMENT_ORDER.length - 1 ? SEGMENT_ORDER[index + 1]! : null;
}

export function getPrevSegment(current: DemoSegment): DemoSegment | null {
  const index = getSegmentIndex(current);
  return index > 0 ? SEGMENT_ORDER[index - 1]! : null;
}

export function getSegmentPath(segment: DemoSegment): string {
  switch (segment) {
    case "landing":
      return "/demo";
    case "portfolio":
      return "/demo/portfolio";
    case "add-client":
      return "/demo/add-client";
    case "client":
      return "/demo/client";
  }
}

function getSegmentFromPath(pathname: string): DemoSegment {
  if (pathname === "/demo") return "landing";
  if (pathname.startsWith("/demo/portfolio")) return "portfolio";
  if (pathname.startsWith("/demo/add-client")) return "add-client";
  if (pathname.startsWith("/demo/client")) return "client";
  return "landing";
}

interface DemoProviderProps {
  children: ReactNode;
  initialSegment?: DemoSegment;
}

export function DemoProvider({
  children,
  initialSegment = "landing",
}: DemoProviderProps) {
  const pathname = usePathname();
  // Derive current segment from pathname
  const currentSegment = getSegmentFromPath(pathname);

  const [state, setState] = useState<DemoState>({
    currentSegment: initialSegment,
    currentTourStep: 0,
    hasCompletedClientCreation: false,
    showTour: true,
    tourCompletedForSegment: null,
    isTransitioning: false,
  });

  // Track previous segment to reset tour when navigating
  const [prevSegment, setPrevSegment] = useState<DemoSegment>(currentSegment);

  // Update state when segment changes (derived from pathname)
  if (currentSegment !== prevSegment) {
    setPrevSegment(currentSegment);
    setState((prev) => ({
      ...prev,
      currentSegment,
      currentTourStep: 0,
      showTour: true,
    }));
  }

  const nextTourStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentTourStep: prev.currentTourStep + 1,
    }));
  }, []);

  const prevTourStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentTourStep: Math.max(0, prev.currentTourStep - 1),
    }));
  }, []);

  const goToTourStep = useCallback((step: number) => {
    setState((prev) => ({
      ...prev,
      currentTourStep: Math.max(0, step),
    }));
  }, []);

  const resetTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentTourStep: 0,
    }));
  }, []);

  const toggleTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showTour: !prev.showTour,
    }));
  }, []);

  const setShowTour = useCallback((show: boolean) => {
    setState((prev) => ({
      ...prev,
      showTour: show,
    }));
  }, []);

  const completeTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showTour: false,
      tourCompletedForSegment: prev.currentSegment,
    }));
  }, []);

  const simulateClientCreation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasCompletedClientCreation: true,
    }));
  }, []);

  const setCurrentSegment = useCallback((segment: DemoSegment) => {
    setState((prev) => ({
      ...prev,
      currentSegment: segment,
      currentTourStep: 0, // Reset tour when changing segments
    }));
  }, []);

  const setIsTransitioning = useCallback((transitioning: boolean) => {
    setState((prev) => ({
      ...prev,
      isTransitioning: transitioning,
    }));
  }, []);

  return (
    <DemoContext.Provider
      value={{
        state,
        nextTourStep,
        prevTourStep,
        goToTourStep,
        resetTour,
        toggleTour,
        setShowTour,
        completeTour,
        simulateClientCreation,
        setCurrentSegment,
        setIsTransitioning,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext(): DemoContextValue {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemoContext must be used within a DemoProvider");
  }
  return context;
}

export function useDemoContextOptional(): DemoContextValue | null {
  return useContext(DemoContext);
}
