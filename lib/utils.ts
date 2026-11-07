import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";

// Tailwind class merging helper — safe for client and server
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

// Format ISO date string for display — safe for client and server
export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy – h:mm a");
  } catch {
    return iso;
  }
}

// Sleep helper for retry/backoff — server-only usage
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exponential backoff sleep: attempt 0 → 1s, 1 → 2s, 2 → 4s …
export function backoffMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

// Remove undefined keys from an object (for Supabase updates)
export function cleanPayload<T extends Record<string, unknown>>(
  obj: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// Returns true when MOCK_MODE env variable is "true"
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === "true";
}
