/**
 * Max early-access surfaces. Banner only lights when a real feature string is set.
 */
export function maxEarlyAccessFeature(): string | null {
  const feature = process.env.NEXT_PUBLIC_MAX_EARLY_ACCESS_FEATURE?.trim()
  return feature || null
}

export function hasMaxEarlyAccessFeature(): boolean {
  return maxEarlyAccessFeature() !== null
}
