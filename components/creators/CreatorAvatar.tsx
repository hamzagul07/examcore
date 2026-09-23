/** Initials on a stamp — avatars are stored but never uploaded, so this is the face. */
export function CreatorAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const parts = name.replace(/^@/, '').trim().split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : (parts[0] ?? '?').slice(0, 2)
  return (
    <span
      className={`ms-cr-avatar${size === 'lg' ? ' ms-cr-avatar--lg' : ''}`}
      aria-hidden
    >
      {initials.toUpperCase()}
    </span>
  )
}
