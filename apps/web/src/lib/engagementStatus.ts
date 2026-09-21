export const ENGAGEMENT_STATUSES = ["ACTIVE", "ON_HOLD", "COMPLETE"] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

export const ENGAGEMENT_STATUS_LABELS: Record<EngagementStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETE: "Complete",
};

export function isEngagementStatus(s: string): s is EngagementStatus {
  return (ENGAGEMENT_STATUSES as readonly string[]).includes(s);
}

export function engagementStatusBadge(status: string) {
  if (status === "ACTIVE") return "hh-badge hh-badge--success";
  if (status === "ON_HOLD") return "hh-badge hh-badge--warning";
  return "hh-badge";
}
