export interface PlanDetails {
  id: string;
  name: string;
  price: number; // in INR
  durationDays: number;
  periodLabel: string;
  savingsLabel?: string;
  description?: string;
}

export const PLANS: Record<string, PlanDetails> = {
  "1M": {
    id: "1M",
    name: "1 Month",
    price: 999,
    durationDays: 30,
    periodLabel: "₹999 a month",
  },
  "2M": {
    id: "2M",
    name: "2 Months",
    price: 1499,
    durationDays: 60,
    periodLabel: "₹750 a month, you save ₹499",
  },
  "3M": {
    id: "3M",
    name: "3 Months",
    price: 1999,
    durationDays: 90,
    periodLabel: "₹666 a month, you save ₹998",
  },
  TEST: {
    id: "TEST",
    name: "Test plan",
    price: 1,
    durationDays: 30,
    periodLabel: "Admin only, for testing payments",
  },
};

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLANS;
}
