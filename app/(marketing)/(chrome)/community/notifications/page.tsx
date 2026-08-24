import { NotificationsInbox } from '@/components/community/NotificationsInbox'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Notifications — Exam Room',
  description: 'Your Exam Room activity notifications.',
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
