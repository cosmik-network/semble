/**
 * Shared ISO-week (Mon–Sun, UTC) range helpers for product-analytics queries.
 *
 * Postgres `date_trunc('week', ...)` returns the Monday 00:00 of the week. We
 * mirror that in JS so the application-side gap-fill produces exactly the same
 * week-start keys the SQL emits.
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Monday 00:00:00 UTC of the ISO week containing `d`. */
export function startOfIsoWeekUTC(d: Date): Date {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // getUTCDay: 0=Sun..6=Sat. Days since Monday: Sun -> 6, else day-1.
  const dayOfWeek = date.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date;
}

export interface ResolvedWeekRange {
  /** Inclusive Monday 00:00 UTC of the earliest week. null => all-time (no lower bound). */
  lowerBound: Date | null;
  /** Exclusive upper bound: the Monday AFTER the most recent week in the series. */
  upperBoundExclusive: Date;
  /** Inclusive Monday 00:00 UTC of the most recent week in the series. */
  endWeekStart: Date;
}

/**
 * Resolve the [lowerBound, upperBoundExclusive) timestamp range and the end
 * week start from the caller's options.
 *
 * - `endWeek` omitted => most recent COMPLETED week (current in-progress week excluded).
 * - `endWeek` provided => the ISO week that date falls in (inclusive).
 * - `weeks` falsy (0/undefined) => all-time (lowerBound = null).
 */
export function resolveWeekRange(
  endWeek: string | undefined,
  weeks: number | undefined,
  now: Date,
): ResolvedWeekRange {
  let endWeekStart: Date;
  if (endWeek) {
    endWeekStart = startOfIsoWeekUTC(new Date(endWeek));
  } else {
    // Most recent completed week = the week before the current (in-progress) one.
    const currentWeekStart = startOfIsoWeekUTC(now);
    endWeekStart = new Date(currentWeekStart.getTime() - WEEK_MS);
  }

  const upperBoundExclusive = new Date(endWeekStart.getTime() + WEEK_MS);

  let lowerBound: Date | null = null;
  if (weeks && weeks > 0) {
    lowerBound = new Date(endWeekStart.getTime() - (weeks - 1) * WEEK_MS);
  }

  return { lowerBound, upperBoundExclusive, endWeekStart };
}

/**
 * Build the dense, chronological list of week-start ISO strings the series
 * should contain, so callers can left-merge sparse SQL rows onto it.
 *
 * When the range is all-time, `firstRowWeekStart` (the earliest week-start
 * actually returned by SQL) is used as the lower bound; if there are no rows,
 * an empty list is returned.
 */
export function enumerateWeekStarts(
  range: ResolvedWeekRange,
  firstRowWeekStart: Date | null,
): string[] {
  const lower = range.lowerBound ?? firstRowWeekStart;
  if (!lower) return [];

  const result: string[] = [];
  for (
    let t = lower.getTime();
    t < range.upperBoundExclusive.getTime();
    t += WEEK_MS
  ) {
    result.push(new Date(t).toISOString());
  }
  return result;
}

/** Normalize a SQL-returned week_start value to the same ISO string keys we enumerate. */
export function weekStartKey(value: string | Date): string {
  return new Date(value).toISOString();
}
