import type { SiteNavItem } from '@/lib/site-nav'

export type MarketingNavItem = Pick<SiteNavItem, 'href' | 'label' | 'children'>
