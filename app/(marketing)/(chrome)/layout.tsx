import { MarketingShell } from '@/components/marketing/MarketingSiteShell'

/** Standard marketing chrome — MARKETING_PREFIXES in lib/site-chrome.ts. */
export default function ChromeGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketingShell>{children}</MarketingShell>
}
