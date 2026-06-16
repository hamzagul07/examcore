export function PricingPageSkeleton() {
  return (
    <main className="pricing-page" aria-busy="true" aria-label="Loading pricing">
      <div className="pg">
        <div className="mn-skeleton mn-skeleton-crumb" />
        <div className="mn-skeleton-block mn-skeleton-pricing-hero" />
        <div className="plans">
          <div className="mn-skeleton-block mn-skeleton-plan card" />
          <div className="mn-skeleton-block mn-skeleton-plan card" />
        </div>
      </div>
    </main>
  )
}
