// Single source of truth for plans. Prices are in rupees.
// The server ALWAYS looks up the price here - it never trusts an amount from the browser.

export type PlanId = "1M" | "2M" | "3M" | "TEST";

export const PLANS: Record<PlanId, { label: string; months: number; price: number }> = {
  "1M": { label: "1 Month", months: 1, price: 999 },
  "2M": { label: "2 Months", months: 2, price: 1499 },
  "3M": { label: "3 Months", months: 3, price: 1999 },
  // Rs 1 plan for testing a real payment. Hidden from customers and only
  // purchasable by emails in ADMIN_EMAILS (enforced on the server).
  TEST: { label: "Test plan", months: 1, price: 1 },
};

export const PUBLIC_PLAN_IDS: PlanId[] = ["1M", "2M", "3M"];

/** Plans shown on the page. The test plan appears only if NEXT_PUBLIC_SHOW_TEST_PLAN=true. */
export function visiblePlanIds(): PlanId[] {
  return process.env.NEXT_PUBLIC_SHOW_TEST_PLAN === "true" ? [...PUBLIC_PLAN_IDS, "TEST"] : PUBLIC_PLAN_IDS;
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function planLabel(id: string | null | undefined): string {
  return id && isPlanId(id) ? PLANS[id].label : "-";
}