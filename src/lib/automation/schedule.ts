import { CronExpressionParser } from "cron-parser";
import type { AutomationFrequency } from "@/lib/store-types";

/**
 * Frequency is the user-facing schedule; cron is the machine one.
 *
 * Standard cron cannot express "once" or "every two weeks", so those two are
 * driven by `frequency` plus `lastRunAt` instead, and the stored cron only
 * carries the time of day for them. Everything else maps straight onto cron.
 */
export const FREQUENCY_LABELS: Record<AutomationFrequency, string> = {
  once: "One time",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  custom: "Custom (cron)",
};

export const FREQUENCY_HINTS: Record<AutomationFrequency, string> = {
  once: "Runs at the next scheduled time, then switches itself off.",
  daily: "Runs every day.",
  weekly: "Runs every Monday.",
  biweekly: "Runs every second Monday, counted from the last run.",
  monthly: "Runs on the 1st of each month.",
  custom: "Runs on the cron expression below.",
};

export const FREQUENCY_ORDER: AutomationFrequency[] = [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "custom",
];

const DEFAULT_MINUTE = 0;
const DEFAULT_HOUR = 9;

/** Pulls the time of day out of a cron so switching frequency keeps it. */
export function timeOfDayFromCron(cron: string): { minute: number; hour: number } {
  const [minute, hour] = (cron || "").trim().split(/\s+/);
  const m = Number(minute);
  const h = Number(hour);
  return {
    minute: Number.isInteger(m) && m >= 0 && m <= 59 ? m : DEFAULT_MINUTE,
    hour: Number.isInteger(h) && h >= 0 && h <= 23 ? h : DEFAULT_HOUR,
  };
}

/**
 * The cron a frequency should store. `custom` keeps whatever the user typed;
 * `once` and `biweekly` get a daily-shaped cron that supplies only the time.
 */
export function cronForFrequency(frequency: AutomationFrequency, currentCron: string): string {
  if (frequency === "custom") return currentCron;

  const { minute, hour } = timeOfDayFromCron(currentCron);
  switch (frequency) {
    case "weekly":
    case "biweekly":
      return `${minute} ${hour} * * 1`;
    case "monthly":
      return `${minute} ${hour} 1 * *`;
    case "once":
    case "daily":
    default:
      return `${minute} ${hour} * * *`;
  }
}

/** Next fire time for a cron expression, or null when it will not parse. */
export function nextCronRun(
  cron: string,
  timezone: string,
  from: Date = new Date(),
): Date | null {
  try {
    return CronExpressionParser.parse(cron, { tz: timezone || "UTC", currentDate: from })
      .next()
      .toDate();
  } catch {
    return null;
  }
}

/**
 * When this automation should next run, honouring the frequencies cron cannot
 * express. Returns null when it should not run again.
 */
export function nextRunFor(
  automation: {
    frequency: AutomationFrequency;
    scheduleCron: string;
    timezone: string;
    lastRunAt?: string | null;
  },
  from: Date = new Date(),
): Date | null {
  const { frequency, scheduleCron, timezone, lastRunAt } = automation;

  // A one-time job is spent as soon as it has run.
  if (frequency === "once" && lastRunAt) return null;

  if (frequency === "biweekly" && lastRunAt) {
    // Skip a fortnight, then snap to the next scheduled weekday, which lands
    // exactly two weeks after the previous run rather than one.
    const skipTo = new Date(new Date(lastRunAt).getTime() + 13 * 24 * 60 * 60 * 1000);
    return nextCronRun(scheduleCron, timezone, skipTo > from ? skipTo : from);
  }

  return nextCronRun(scheduleCron, timezone, from);
}

/** Human summary for the settings form. */
export function describeNextRun(
  automation: {
    frequency: AutomationFrequency;
    scheduleCron: string;
    timezone: string;
    lastRunAt?: string | null;
    enabled?: boolean;
  },
): string {
  if (automation.frequency === "once" && automation.lastRunAt) {
    return "Already run — this one-time campaign is finished.";
  }
  const next = nextRunFor(automation);
  if (!next) return "That cron expression is not valid.";
  const when = next.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return automation.enabled === false
    ? `Would run ${when} once enabled.`
    : `Next run ${when}.`;
}
