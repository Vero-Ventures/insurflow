"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type DemoSegment =
  | "landing"
  | "intake"
  | "estimate"
  | "showcase"
  | "handoff";
export type DemoMode = "guided" | "quick";
export type DemoScenarioId =
  | "young-family"
  | "business-succession"
  | "high-net-worth-estate";

export type HouseholdStatus =
  | "single"
  | "married"
  | "partnered"
  | "single_parent";

export interface DemoIntakeData {
  householdStatus: HouseholdStatus;
  annualHouseholdIncome: string;
  totalDebts: string;
  currentCoverage: string;
  primaryGoal: string;
  province?: string;
}

interface DemoState {
  currentSegment: DemoSegment;
  currentTourStep: number;
  showTour: boolean;
  tourCompletedForSegment: DemoSegment | null;
  isTransitioning: boolean;
  demoMode: DemoMode;
  selectedScenarioId: DemoScenarioId;
  analysisAssumptions: {
    incomeReplacementPercent: number;
    replacementDurationYears: number;
    liquidAssets: number;
  };
  intakeData: DemoIntakeData;
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
  updateIntakeData: (updates: Partial<DemoIntakeData>) => void;
  resetIntakeData: () => void;
  setCurrentSegment: (segment: DemoSegment) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  setDemoMode: (mode: DemoMode) => void;
  setSelectedScenarioId: (scenarioId: DemoScenarioId) => void;
  updateAnalysisAssumptions: (
    updates: Partial<DemoState["analysisAssumptions"]>,
  ) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export const DEFAULT_DEMO_INTAKE_DATA: DemoIntakeData = {
  householdStatus: "married",
  annualHouseholdIncome: "210000",
  totalDebts: "515500",
  currentCoverage: "250000",
  primaryGoal:
    "Protect monthly cash flow and keep the mortgage manageable for my family.",
};

const SEGMENT_ORDER: DemoSegment[] = [
  "landing",
  "intake",
  "estimate",
  "showcase",
  "handoff",
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
    case "intake":
      return "/demo/intake";
    case "estimate":
      return "/demo/estimate";
    case "showcase":
      return "/demo/showcase";
    case "handoff":
      return "/demo/handoff";
  }
}

function getSegmentFromPath(pathname: string): DemoSegment {
  if (pathname === "/demo") return "landing";
  if (pathname.startsWith("/demo/intake")) return "intake";
  if (pathname.startsWith("/demo/estimate")) return "estimate";
  if (pathname.startsWith("/demo/showcase")) return "showcase";
  if (pathname.startsWith("/demo/handoff")) return "handoff";
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
    showTour: true,
    tourCompletedForSegment: null,
    isTransitioning: false,
    demoMode: "guided",
    selectedScenarioId: "young-family",
    analysisAssumptions: {
      incomeReplacementPercent: 70,
      replacementDurationYears: 15,
      liquidAssets: 70000,
    },
    intakeData: DEFAULT_DEMO_INTAKE_DATA,
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

  const updateIntakeData = useCallback((updates: Partial<DemoIntakeData>) => {
    setState((prev) => ({
      ...prev,
      intakeData: {
        ...prev.intakeData,
        ...updates,
      },
    }));
  }, []);

  const resetIntakeData = useCallback(() => {
    setState((prev) => ({
      ...prev,
      intakeData: DEFAULT_DEMO_INTAKE_DATA,
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

  const setDemoMode = useCallback((mode: DemoMode) => {
    setState((prev) => ({
      ...prev,
      demoMode: mode,
    }));
  }, []);

  const setSelectedScenarioId = useCallback((scenarioId: DemoScenarioId) => {
    setState((prev) => ({
      ...prev,
      selectedScenarioId: scenarioId,
    }));
  }, []);

  const updateAnalysisAssumptions = useCallback(
    (updates: Partial<DemoState["analysisAssumptions"]>) => {
      setState((prev) => ({
        ...prev,
        analysisAssumptions: {
          ...prev.analysisAssumptions,
          ...updates,
        },
      }));
    },
    [],
  );

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
        updateIntakeData,
        resetIntakeData,
        setCurrentSegment,
        setIsTransitioning,
        setDemoMode,
        setSelectedScenarioId,
        updateAnalysisAssumptions,
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
