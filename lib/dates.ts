// All dates are handled as "YYYY-MM-DD" strings in Indian time (Asia/Kolkata),
// so a customer never loses/gains a day because of server timezone.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parse(d: string): { y: number; m: number; day: number } {
  const [y, m, day] = d.split("-").map(Number);
  return { y, m, day };
}

function toStr(y: number, m: number, day: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Add calendar months. 31 Jan + 1 month = 28/29 Feb (clamped to month end). */
export function addMonths(date: string, months: number): string {
  const { y, m, day } = parse(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return toStr(ny, nm, Math.min(day, lastDay));
}

export function addDays(date: string, days: number): string {
  const { y, m, day } = parse(date);
  const d = new Date(Date.UTC(y, m - 1, day + days));
  return toStr(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  const ms = Date.UTC(b.y, b.m - 1, b.day) - Date.UTC(a.y, a.m - 1, a.day);
  return Math.round(ms / 86400000);
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

/** "2026-10-19" -> "19 Oct 2026" */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  const { y, m, day } = parse(date);
  return `${day} ${MONTHS[m - 1]} ${y}`;
}
