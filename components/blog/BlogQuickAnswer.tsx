import { extractLeadParagraph } from '@/lib/seo/content-extract'

type Props = {
  title: string
  description: string
  content: string
  date?: string
}

/** AEO / AI Overview — direct answer block above the article body. */
export function BlogQuickAnswer({ title, description, content, date }: Props) {
  const answer = description.trim() || extractLeadParagraph(content)
  if (!answer) return null

  return (
    <aside className="ms-quick-answer mt-8" aria-label="Quick answer">
      <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 8 }}>
        Quick answer
      </p>
      <p className="ms-body-2" style={{ fontSize: 16, color: 'var(--ec-text-primary)' }}>
        {answer}
      </p>
      {date ? (
        <p className="ms-micro" style={{ marginTop: 12 }}>
          <time dateTime={date}>
            Updated {new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </time>
          {' · '}
          <span itemProp="about">{title}</span>
        </p>
      ) : null}
    </aside>
  )
}
