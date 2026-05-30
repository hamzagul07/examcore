import type { Components } from 'react-markdown'

export type RichTextVariant = 'dark' | 'light'

/**
 * Shared react-markdown component map for marking feedback and Omni-AI.
 * `dark` matches late-night / zen cards; `light` is for solution panels on pale backgrounds.
 */
export function createMarkdownComponents(
  variant: RichTextVariant = 'dark'
): Components {
  const isDark = variant === 'dark'

  const textPrimary = isDark ? 'text-white' : 'text-slate-900'
  const textBody = isDark ? 'text-slate-200' : 'text-slate-700'
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500'
  const textEm = isDark ? 'text-emerald-300' : 'text-emerald-700'
  const codeBg = isDark ? 'bg-white/10' : 'border border-slate-200 bg-slate-100'
  const codeText = isDark ? 'text-emerald-300' : 'text-emerald-800'
  const preBg = isDark
    ? 'border border-white/10 bg-dark-900/80'
    : 'border border-slate-200 bg-slate-100'
  const preText = isDark ? 'text-slate-200' : 'text-slate-800'
  const tableBorder = isDark ? 'border-white/15' : 'border-slate-200'
  const tableHead = isDark ? 'bg-white/5 text-slate-200' : 'bg-slate-100 text-slate-800'
  const blockquoteBorder = isDark ? 'border-emerald-500/40' : 'border-emerald-500/50'

  return {
    p: ({ children }) => (
      <p
        className={`mb-2 leading-relaxed last:mb-0 ${textBody}`}
        style={isDark ? { color: 'var(--ec-text-secondary, inherit)' } : undefined}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong
        className={`font-semibold ${textPrimary}`}
        style={isDark ? { color: 'var(--ec-text-primary, inherit)' } : undefined}
      >
        {children}
      </strong>
    ),
    em: ({ children }) => <em className={textEm}>{children}</em>,
    ul: ({ children }) => (
      <ul className={`my-2 list-disc space-y-1 pl-5 ${textBody}`}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className={`my-2 list-decimal space-y-1 pl-5 ${textBody}`}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return <code className={`font-mono text-xs ${preText}`}>{children}</code>
      }
      return (
        <code
          className={`rounded px-1.5 py-0.5 font-mono text-sm ${codeBg} ${codeText}`}
        >
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre
        className={`my-3 overflow-x-auto rounded-xl p-4 font-mono text-xs ${preBg} ${preText}`}
      >
        {children}
      </pre>
    ),
    h1: ({ children }) => (
      <h1 className={`mb-2 mt-4 text-xl font-bold ${textPrimary}`}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className={`mb-2 mt-3 text-lg font-bold ${textPrimary}`}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className={`mb-2 mt-3 text-lg font-bold ${textPrimary}`}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className={`mb-2 mt-2 text-base font-semibold ${textPrimary}`}>
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={`border-l-2 pl-3 italic ${blockquoteBorder} ${textMuted}`}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr className={isDark ? 'my-4 border-white/10' : 'my-4 border-slate-200'} />
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className={`min-w-full border-collapse text-sm ${textBody}`}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className={tableHead}>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr className={`border-b ${tableBorder}`}>{children}</tr>
    ),
    th: ({ children }) => (
      <th className={`border px-3 py-2 text-left font-semibold ${tableBorder}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border px-3 py-2 ${tableBorder}`}>{children}</td>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  }
}
