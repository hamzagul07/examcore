import type { SignedAttachment } from '@/lib/community/uploads'

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PostAttachments({ attachments }: { attachments: SignedAttachment[] }) {
  if (!attachments.length) return null
  const images = attachments.filter((a) => a.kind === 'image' && a.url)
  const files = attachments.filter((a) => a.kind !== 'image')

  return (
    <div className="rc-post-attachments">
      {images.length ? (
        <div className="rc-attach-images">
          {images.map((a) => (
            // eslint-disable-next-line @next/next/no-img-element
            <a key={a.path} href={a.url!} target="_blank" rel="noopener noreferrer" className="rc-attach-image-link">
              <img src={a.url!} alt={a.name} loading="lazy" className="rc-attach-image" />
            </a>
          ))}
        </div>
      ) : null}
      {files.length ? (
        <ul className="rc-attach-files">
          {files.map((a) => (
            <li key={a.path}>
              {a.url ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="rc-attach-file">
                  <span className="rc-attach-file-icon">{a.kind === 'pdf' ? '📄' : '📎'}</span>
                  <span className="rc-attach-file-name">{a.name}</span>
                  <span className="rc-attach-file-size">{fmtSize(a.size)}</span>
                  <span className="rc-attach-file-dl">Download ↓</span>
                </a>
              ) : (
                <span className="rc-attach-file rc-attach-file-expired">{a.name} (unavailable)</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
