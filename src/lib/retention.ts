/**
 * Retention clock for a minor-ailment record.
 *
 * EO Notice (Pharmacy Documentation Requirements): records must be kept for the
 * LONGER of:
 *   - 10 years from the last recorded service to the individual, and
 *   - 10 years after the day the individual reached (or would have reached) 18.
 *
 * The age-18 branch is the one that bites for children and the one everyone
 * forgets: a child assessed in 2026 is retained well past service + 10 years.
 * e.g. born 2019, assessed 2026 → max(2036, 2047) = 2047.
 */

/** Add whole calendar years to a date (Feb 29 rolls to Mar 1 in non-leap years). */
export function addYears(d: Date, years: number): Date {
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + years);
  return r;
}

/**
 * retain_until = max( serviceDate + 10y , (dob + 18y) + 10y ).
 * Both inputs are treated as calendar dates.
 */
export function computeRetainUntil(serviceDate: Date, dob: Date): Date {
  const tenFromService = addYears(serviceDate, 10);
  const tenAfterEighteen = addYears(dob, 28); // (dob + 18) + 10
  return tenAfterEighteen.getTime() > tenFromService.getTime()
    ? tenAfterEighteen
    : tenFromService;
}
