import { MarketingHeader } from '@/components/layout/MarketingHeader'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { WireframeBackgroundGate } from '@/components/design-system/WireframeBackgroundGate'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <WireframeBackgroundGate />
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </>
  )
}
