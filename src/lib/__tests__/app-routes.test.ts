import { describe, expect, it } from "vitest";

import {
  ADVISOR_WORKSPACE_ROUTE,
  AUTHENTICATED_HOME_ROUTE,
  CLIENT_INTAKE_START_ROUTE,
  DEMO_HANDOFF_ROUTE,
  DEMO_INTAKE_ROUTE,
  DEMO_SNAPSHOT_ROUTE,
  USER_PROFILE_ROUTE,
  USER_SETTINGS_ROUTE,
} from "@/lib/app-routes";

describe("app route constants", () => {
  it("uses dashboard as authenticated home", () => {
    expect(AUTHENTICATED_HOME_ROUTE).toBe("/dashboard");
  });

  it("keeps legacy advisor workspace route available", () => {
    expect(ADVISOR_WORKSPACE_ROUTE).toBe("/clients");
  });

  it("defines production journey routes for authenticated users", () => {
    expect(CLIENT_INTAKE_START_ROUTE).toBe("/clients?intent=create");
    expect(USER_PROFILE_ROUTE).toBe("/profile");
    expect(USER_SETTINGS_ROUTE).toBe("/settings");
  });

  it("defines primary client journey destinations", () => {
    expect(DEMO_INTAKE_ROUTE).toBe("/demo/intake");
    expect(DEMO_SNAPSHOT_ROUTE).toBe("/demo/estimate");
    expect(DEMO_HANDOFF_ROUTE).toBe("/demo/handoff");
  });
});
