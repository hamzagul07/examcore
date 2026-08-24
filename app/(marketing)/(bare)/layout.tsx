import { BareShell } from '@/components/marketing/MarketingSiteShell'

/** Routes that own their chrome — getSiteChromeVariant returns 'none'. */
export default function BareGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BareShell>{children}</BareShell>
}
