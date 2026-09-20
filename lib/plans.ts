// Single source of truth for plans. Prices are in rupees.
// The server ALWAYS looks up the price here - it never trusts an amount from the browser.

export type PlanId = "1M" | "2M" | "3M";

export const PLANS: Record<PlanId, { label: string; months: number; price: number }> = {
  "1M": { label: "1 Month", months: 1, price: 999 },
  "2M": { label: "2 Months", months: 2, price: 1499 },
  "3M": { label: "3 Months", months: 3, price: 1999 },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}

export function planLabel(id: string | null | undefined): string {
  return id && isPlanId(id) ? PLANS[id].label : "-";
}
