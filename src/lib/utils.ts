import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getTodayString(): string {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalDateString(date: Date): string {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day   = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getOrCreateDay(userId: string, date: string) {
  return date || getTodayString();
}

interface SimpleSet {
  weight:     number | null;
  reps:       number | null;
  percentage: number | null;
}

export function calculateExpectedMax(
  resultSets: SimpleSet[],
  planSets:   SimpleSet[]
): { min: number; max: number } | null {
  const estimates: number[] = [];

  // ── result sets → Epley formula: weight × (1 + reps/30) ──
  for (const s of resultSets) {
    if (s.weight && s.reps && s.reps >= 1 && s.reps <= 15) {
      estimates.push(s.weight * (1 + s.reps / 30));
    }
  }

  // ── plan sets with % → weight / (% / 100) ────────────────
  // only use if result weight > plan weight (athlete exceeded plan)
  for (let i = 0; i < planSets.length; i++) {
    const plan   = planSets[i];
    const result = resultSets[i];
    if (
      plan.percentage && plan.percentage > 0 && plan.percentage < 100 &&
      result?.weight && result.weight > 0
    ) {
      estimates.push(result.weight / (plan.percentage / 100));
    }
  }

  if (estimates.length === 0) return null;

  const sorted = [...estimates].sort((a, b) => a - b);

  // round to nearest 2.5kg
  const raw_min = sorted[0];
  const raw_max = sorted[sorted.length - 1];
  const min     = Math.floor(raw_min / 2.5) * 2.5;
  const max     = Math.ceil(raw_max  / 2.5) * 2.5;

  return min === max ? { min, max: max + 2.5 } : { min, max };
}