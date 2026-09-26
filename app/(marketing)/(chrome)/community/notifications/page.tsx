import { NotificationsInbox } from '@/components/community/NotificationsInbox'
import { createPageMetadata } from '@/lib/seo/metadata'

// Product-neutral: besides Exam Room activity this lists class updates
// (sets, feedback) — and it is reachable with the Exam Room switched off.
export const metadata = createPageMetadata({
  title: 'Notifications',
  description: 'Your notifications: marks, class updates and Exam Room activity.',
  path: '/community/notifications',
  index: false,
})

export default function CommunityNotificationsPage() {
  return (
    <div className="rc-page rc-page-narrow" style={{ maxWidth: 640, margin: '0 auto' }}>
      <NotificationsInbox />
    </div>
  )
}
