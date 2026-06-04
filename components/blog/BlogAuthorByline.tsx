import Link from 'next/link'
import { getAuthor } from '@/lib/seo/authors'

type Props = {
  authorId?: string | null
}

/** E-E-A-T: named author with credentials and about link. */
export function BlogAuthorByline({ authorId }: Props) {
  const author = getAuthor(authorId)

  return (
    <div className="mt-6 flex flex-wrap items-start gap-4 border-t border-[var(--ec-border)] pt-6">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] font-semibold text-[var(--ec-brand)]"
        aria-hidden
      >
        {author.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ec-text-primary)]">
          Written by{' '}
          <Link href={author.url} className="ec-link">
            {author.name}
          </Link>
          <span className="font-normal text-[var(--ec-text-secondary)]">
            {' '}
            · {author.role}
          </span>
        </p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          {author.bio}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {author.credentials.map((c) => (
            <li
              key={c}
              className="rounded-full border border-[var(--ec-border)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ec-text-secondary)]"
            >
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
