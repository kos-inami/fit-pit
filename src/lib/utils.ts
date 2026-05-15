import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0]; // "2025-05-03"
}

export function getOrCreateDay(userId: string, date: string) {
  return date || getTodayString();
}