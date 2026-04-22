/**
 * Deterministic, per-ticket inflater. The visitor sees a 4-digit number that
 * looks like it comes from a much larger pool, even though the real
 * `ticketNumber` (used for assignment + admin) is a small sequential int.
 *
 * Same `n` always maps to the same displayed value, so a page reload never
 * shows a different number for the same attempt.
 */
export function computeDisplayTicket(n: number | null | undefined): number | null {
  if (n == null) return null;
  // Add 500..1000 based on ticket — spread so consecutive tickets don't look sequential.
  return n + 500 + ((n * 37) % 501);
}
