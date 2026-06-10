import { MarketingHeader } from '@/components/layout/MarketingHeader'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { ScrollProgressBar } from '@/components/design-system/ScrollProgressBar'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ScrollProgressBar />
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </>
  )
}