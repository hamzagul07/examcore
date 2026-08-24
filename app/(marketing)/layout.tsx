/**
 * Passthrough.
 *
 * This layout used to render the whole marketing shell, which meant reading
 * `x-pathname` from `headers()` to pick a chrome variant — and a headers() call
 * in a layout opts its entire route group out of static generation. The variant
 * is now encoded in the route tree by the (reading), (chrome) and (bare) groups
 * below, each of which renders its shell directly.
 *
 * Kept rather than deleted so the group has a place for shared error and
 * opengraph handling, and so nothing here can quietly reintroduce a
 * request-time read for every page under it.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
