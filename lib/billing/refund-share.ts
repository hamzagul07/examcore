/**
 * How many credits a refund should reverse.
 *
 * Proportional to the money actually returned, rounded to the nearest whole
 * credit and clamped to the pack. The webhook used to reverse the ENTIRE pack on
 * any refund, so a 10% goodwill refund on a 500-credit pack took up to 500
 * credits: the customer paid for 450 of them and kept none.
 *
 * Falls back to the whole pack when the amounts are missing or unusable. That is
 * the previous behaviour and the right default here — if we cannot tell a
 * partial refund from a full one, reversing nothing on a fully refunded order is
 * the worse error.
 *
 * Lives outside the route so it can be tested without importing the Polar SDK,
 * the Supabase service client, and next/server alongside it.
 */
export function refundedCreditShare(
  packCredits: number,
  refundedAmount: number | null | undefined,
  orderAmount: number | null | undefined
): number {
  if (
    typeof refundedAmount !== 'number' ||
    typeof orderAmount !== 'number' ||
    !Number.isFinite(refundedAmount) ||
    !Number.isFinite(orderAmount) ||
    orderAmount <= 0 ||
    refundedAmount <= 0
  ) {
    return packCredits
  }
  if (refundedAmount >= orderAmount) return packCredits
  const share = Math.round((packCredits * refundedAmount) / orderAmount)
  return Math.max(0, Math.min(packCredits, share))
}
