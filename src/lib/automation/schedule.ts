import { CronExpressionParser } from "cron-parser";
import type { AutomationFrequency } from "@/lib/store-types";

/**
 * Frequency is the user-facing schedule; cron is the machine one.
 *
 * The writer sets a frequency, a date and a time. The date means something
 * different for each frequency — the day a one-off runs, the weekday a weekly
 * repeats on, the anchor a fortnightly counts from — which is why the form
 * relabels it rather than showing four different controls.
 *
 * Standard cron can express neither "once on this date" nor "every two weeks",
 * so those two are computed here instead. Everything tz-sensitive still goes
 * through cron-parser, which is the only thing in the stack that knows how to
 * turn a wall-clock time in Asia/Calcutta into an instant.
 */
export const FREQUENCY_LABELS: Record<AutomationFrequency, string> = {
  once: "One time",
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  custom: "Custom (cron)",
};

export const FREQUENCY_ORDER: AutomationFrequency[] = [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "custom",
];

/** What the date field means for each frequency. */
export const DATE_LABELS: Record<AutomationFrequency, string> = {
  once: "Run on",
  daily: "Start date",
  weekly: "Start date",
  biweekly: "Start date",
  monthly: "Start date",
  custom: "Start date",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export type ScheduleShape = {
  frequency: AutomationFrequency;
  scheduleCron: string;
  timezone: string;
  startDate: string; // YYYY-MM-DD, read in the automation's timezone
  startTime: string; // HH:mm
  lastRunAt?: string | null;
  enabled?: boolean;
};

/* ------------------------------------------------------------------ */
/* Parsing helpers                                                     */
/* ------------------------------------------------------------------ */

/** Parses YYYY-MM-DD without letting the local timezone shift the day. */
function parseDateParts(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((date || "").trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function parseTimeParts(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((time || "").trim());
  if (!match) return { hour: 9, minute: 0 };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { hour: 9, minute: 0 };
  return { hour, minute };
}

/** Day of week for a YYYY-MM-DD, computed in UTC so it cannot drift. */
function weekdayOf(date: string): number | null {
  const parts = parseDateParts(date);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* ------------------------------------------------------------------ */
/* Cron derivation                                                     */
/* ------------------------------------------------------------------ */

/**
 * The cron a frequency should store. `custom` keeps whatever the user typed;
 * `once` and `biweekly` get a cron that carries the time, with the date logic
 * applied separately in `nextRunFor`.
 */
export function cronForFrequency(
  frequency: AutomationFrequency,
  shape: { scheduleCron: string; startDate: string; startTime: string },
): string {
  if (frequency === "custom") return shape.scheduleCron;

  const { hour, minute } = parseTimeParts(shape.startTime);
  const parts = parseDateParts(shape.startDate);

  switch (frequency) {
    case "once":
      // Pinned to the exact day and month; the year is handled by the guard in
      // nextRunFor, since cron has no year field.
      return parts ? `${minute} ${hour} ${parts.day} ${parts.month} *` : `${minute} ${hour} * * *`;
    case "weekly":
    case "biweekly": {
      const weekday = weekdayOf(shape.startDate) ?? 1;
      return `${minute} ${hour} * * ${weekday}`;
    }
    case "monthly":
      return `${minute} ${hour} ${parts?.day ?? 1} * *`;
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

/* ------------------------------------------------------------------ */
/* Next run                                                            */
/* ------------------------------------------------------------------ */

/** Midnight on the start date, used as the "not before" floor. */
function startFloor(shape: ScheduleShape, from: Date): Date {
  const parts = parseDateParts(shape.startDate);
  if (!parts) return from;
  // One second before midnight, so a run scheduled at 00:00 on the start date
  // is still eligible.
  const floor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - 1000);
  return floor > from ? floor : from;
}

/**
 * When this automation should next run, honouring the frequencies cron cannot
 * express. Returns null when it should not run again.
 */
export function nextRunFor(shape: ScheduleShape, from: Date = new Date()): Date | null {
  const { frequency, scheduleCron, timezone, lastRunAt } = shape;

  // A one-time job is spent as soon as it has run.
  if (frequency === "once" && lastRunAt) return null;

  if (frequency === "custom") return nextCronRun(scheduleCron, timezone, from);

  const floor = startFloor(shape, from);

  if (frequency === "once") {
    const parts = parseDateParts(shape.startDate);
    if (!parts) return null;
    const next = nextCronRun(scheduleCron, timezone, from);
    if (!next) return null;
    // cron has no year, so a date that has already passed rolls to next year.
    // A one-off should simply report as expired instead.
    return next.getUTCFullYear() > parts.year ? null : next;
  }

  if (frequency === "biweekly") {
    const anchor = parseDateParts(shape.startDate);
    const base = lastRunAt
      ? new Date(new Date(lastRunAt).getTime() + 13 * 24 * 60 * 60 * 1000)
      : floor;
    const candidate = nextCronRun(scheduleCron, timezone, base > from ? base : from);
    if (!candidate || !anchor || lastRunAt) return candidate;

    // No run yet: keep the fortnightly rhythm measured from the anchor date, so
    // the first run lands on the anchor's week rather than whichever week is next.
    const anchorUtc = Date.UTC(anchor.year, anchor.month - 1, anchor.day);
    const weeksApart = Math.round(
      (Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate()) -
        anchorUtc) /
        (7 * 24 * 60 * 60 * 1000),
    );
    if (weeksApart % 2 === 0) return candidate;
    return nextCronRun(scheduleCron, timezone, new Date(candidate.getTime() + 24 * 60 * 60 * 1000));
  }

  return nextCronRun(scheduleCron, timezone, floor);
}

/* ------------------------------------------------------------------ */
/* Description                                                         */
/* ------------------------------------------------------------------ */

/** Plain-language summary of the repeat rule. */
export function describeFrequency(shape: ScheduleShape): string {
  const weekday = WEEKDAYS[weekdayOf(shape.startDate) ?? 1];
  const day = parseDateParts(shape.startDate)?.day ?? 1;

  switch (shape.frequency) {
    case "once":
      return "Runs once, then switches itself off.";
    case "daily":
      return "Runs every day.";
    case "weekly":
      return `Runs every ${weekday}.`;
    case "biweekly":
      return `Runs every second ${weekday}.`;
    case "monthly":
      return day > 28
        ? `Runs on day ${day} — months without a day ${day} are skipped.`
        : `Runs on day ${day} of each month.`;
    case "custom":
    default:
      return "Runs on the cron expression below.";
  }
}

/** When the next run lands, in the reader's own locale. */
export function describeNextRun(shape: ScheduleShape): string {
  if (shape.frequency === "once" && shape.lastRunAt) {
    return "Already run — this one-time campaign is finished.";
  }
  const next = nextRunFor(shape);
  if (!next) {
    return shape.frequency === "once"
      ? "That date and time have already passed."
      : "That cron expression is not valid.";
  }
  const when = next.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: shape.timezone || undefined,
  });
  return shape.enabled === false
    ? `Would run ${when} (${shape.timezone}) once enabled.`
    : `Next run ${when} (${shape.timezone}).`;
}
