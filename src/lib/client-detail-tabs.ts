export const CLIENT_DETAIL_TABS = [
  "profile",
  "financial",
  "insurance",
  "report",
] as const;

export type ClientDetailTab = (typeof CLIENT_DETAIL_TABS)[number];

const clientDetailTabSet = new Set<string>(CLIENT_DETAIL_TABS);

export function resolveClientTab(
  value: string | null | undefined,
): ClientDetailTab {
  if (!value) {
    return "profile";
  }

  if (clientDetailTabSet.has(value)) {
    return value as ClientDetailTab;
  }

  return "profile";
}

export function buildClientTabHref(
  clientId: string,
  tab: ClientDetailTab,
): string {
  return `/clients/${clientId}?tab=${tab}`;
}
