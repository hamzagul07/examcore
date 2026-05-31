import { MarketingHeader } from '@/components/layout/MarketingHeader'
import { MarketingFooter } from '@/components/layout/MarketingFooter'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div data-ec-theme="zen" className="flex flex-1 flex-col">
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  )
}
