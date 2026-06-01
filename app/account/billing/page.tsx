import { loadAccountContext } from '@/lib/settings/load-account-data'
import { BillingSection } from '@/components/settings/sections/BillingSection'

export const dynamic = 'force-dynamic'

export default async function BillingSettingsPage() {
  const { billing } = await loadAccountContext()

  return <BillingSection billing={billing} />
}
