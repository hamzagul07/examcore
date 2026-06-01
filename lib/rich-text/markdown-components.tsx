import type { Components } from 'react-markdown'

export type RichTextVariant = 'dark' | 'light'

const DARK = {
  textPrimary: 'text-[var(--ec-text-primary)]',
  textBody: 'text-[var(--ec-text-secondary)]',
  textMuted: 'text-[var(--ec-text-secondary)]',
  textEm: 'text-[var(--ec-brand)]',
  codeBg: 'bg-[var(--ec-surface-raised)]',
  codeText: 'text-[var(--ec-brand)]',
  preBg: 'border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]',
  preText: 'text-[var(--ec-text-primary)]',
  tableBorder: 'border-[var(--ec-border)]',
  tableHead:
    'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)]',
  blockquoteBorder: 'border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)]',
  hr: 'my-4 border-[var(--ec-border)]',
  link: 'text-[var(--ec-brand)] underline underline-offset-2 hover:opacity-80',
} as const

const LIGHT = {
  textPrimary: 'text-slate-900',
  textBody: 'text-slate-700',
  textMuted: 'text-slate-500',
  textEm: 'text-emerald-700',
  codeBg: 'border border-slate-200 bg-slate-100',
  codeText: 'text-emerald-800',
  preBg: 'border border-slate-200 bg-slate-100',
  preText: 'text-slate-800',
  tableBorder: 'border-slate-200',
  tableHead: 'bg-slate-100 text-slate-800',
  blockquoteBorder: 'border-emerald-500/50',
  hr: 'my-4 border-slate-200',
  link: 'text-emerald-700 underline underline-offset-2 hover:text-emerald-800',
} as const

/**
 * Shared react-markdown component map for marking feedback and Omni-AI.
 * `dark` uses design tokens (Zen + default); `light` is for solution panels.
 */
export function createMarkdownComponents(
  variant: RichTextVariant = 'dark'
): Components {
  const t = variant === 'dark' ? DARK : LIGHT

  return {
    p: ({ children }) => (
      <p className={`mb-2 leading-relaxed last:mb-0 ${t.textBody}`}>
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className={`font-semibold ${t.textPrimary}`}>{children}</strong>
    ),
    em: ({ children }) => <em className={t.textEm}>{children}</em>,
    ul: ({ children }) => (
      <ul className={`my-2 list-disc space-y-1 pl-5 ${t.textBody}`}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={`my-2 list-decimal space-y-1 pl-5 ${t.textBody}`}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return <code className={`font-mono text-xs ${t.preText}`}>{children}</code>
      }
      return (
        <code
          className={`rounded px-1.5 py-0.5 font-mono text-sm ${t.codeBg} ${t.codeText}`}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre
        className={`my-3 overflow-x-auto rounded-xl p-4 font-mono text-xs ${t.preBg} ${t.preText}`}
      >
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className={`mb-2 mt-4 text-xl font-bold ${t.textPrimary}`}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={`mb-2 mt-3 text-lg font-bold ${t.textPrimary}`}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={`mb-2 mt-3 text-lg font-bold ${t.textPrimary}`}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className={`mb-2 mt-2 text-base font-semibold ${t.textPrimary}`}>
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-2 pl-3 italic ${t.blockquoteBorder} ${t.textMuted}`}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={t.hr} />,
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className={`min-w-full border-collapse text-sm ${t.textBody}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className={t.tableHead}>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className={`border-b ${t.tableBorder}`}>{children}</tr>
    ),
    th: ({ children }) => (
      <th className={`border px-3 py-2 text-left font-semibold ${t.tableBorder}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border px-3 py-2 ${t.tableBorder}`}>{children}</td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className={t.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  }
}
