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
    <aside
      className="ec-blog-quick-answer mt-8 rounded-xl border border-[var(--ec-brand)]/25 bg-[var(--ec-brand)]/5 px-5 py-5 sm:px-6"
      aria-label="Quick answer"
    >
      <p className="ec-label-tech mb-2 text-[var(--ec-brand)]">QUICK ANSWER</p>
      <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
        {answer}
      </p>
      {date ? (
        <p className="mt-3 text-xs text-[var(--ec-text-secondary)]">
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
