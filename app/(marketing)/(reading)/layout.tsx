import { ReadingShell } from '@/components/marketing/MarketingSiteShell'

/** Margin Notes reading chrome — READING_SHELL_PREFIXES in lib/site-chrome.ts. */
export default function ReadingGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ReadingShell>{children}</ReadingShell>
}
