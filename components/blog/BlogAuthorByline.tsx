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
      {author.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={author.image}
          alt={author.name}
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded border border-[var(--ec-border)] object-cover shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.06))]"
        />
      ) : (
        <div
          className="ms-sd-glyph ms-sd-glyph--person"
          style={{ width: 44, height: 44, fontSize: 22 }}
          aria-hidden
        >
          {author.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="ms-body-2 font-semibold text-[var(--ec-text-primary)]">
          Written by{' '}
          <Link href={author.url} className="ec-btn-underline">
            {author.name}
          </Link>
          <span className="font-normal text-[var(--ec-text-secondary)]">
            {' '}
            · {author.role}
          </span>
        </p>
        <p className="ms-body-2 mt-1">{author.bio}</p>
        <ul className="ms-hub-strip mt-2">
          {author.credentials.map((c) => (
            <li key={c}>
              <span className="ec-chip-ms ec-chip-ms--outline">{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
