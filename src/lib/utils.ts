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


export function calculateExpectedMax(
  resultSets: { weight: number | null; reps: number | null }[]
): { min: number; max: number } | null {
  const estimates: number[] = [];

  for (const s of resultSets) {
    if (s.weight && s.reps && s.reps >= 1 && s.reps <= 15) {
      // Epley: weight × (1 + reps/30)
      estimates.push(s.weight * (1 + s.reps / 30));
    }
  }

  if (estimates.length === 0) return null;

  const sorted = [...estimates].sort((a, b) => a - b);
  const min    = Math.floor(sorted[0]                    / 2.5) * 2.5;
  const max    = Math.ceil(sorted[sorted.length - 1]     / 2.5) * 2.5;

  return min === max ? { min, max: max + 2.5 } : { min, max };
}