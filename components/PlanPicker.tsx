"use client";

import { PLANS, visiblePlanIds, type PlanId } from "@/lib/plans";

export default function PlanPicker({ value, onChange }: { value: PlanId; onChange: (p: PlanId) => void }) {
  const monthlyBase = PLANS["1M"].price;
  return (
    <fieldset className="plans">
      <legend className="label">Select plan</legend>
      {visiblePlanIds().map((id) => {
        const p = PLANS[id];
        const perMonth = Math.round(p.price / p.months);
        const saving = p.months * monthlyBase - p.price;
        return (
          <label key={id} className={`plan ${value === id ? "on" : ""}`}>
            <input type="radio" name="plan" value={id} checked={value === id} onChange={() => onChange(id)} />
            <span className="plan-name">{p.label}</span>
            <span className="plan-meta">
              {id === "TEST" ? "Admin only, for testing payments" : `₹${perMonth} a month${saving > 0 ? `, you save ₹${saving}` : ""}`}
            </span>
            <span className="plan-price">₹{p.price}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
