'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: '#0a0a0a',
          color: '#f5f5f5',
        }}
      >
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.08em', opacity: 0.7 }}>
              MARKSCHEME
            </p>
            <h1 style={{ fontSize: '1.75rem', margin: '0.75rem 0' }}>
              Something went wrong
            </h1>
            <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
              A critical error occurred. Try reloading the page, or return home.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '2rem',
              }}
            >
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  background: '#00f5a0',
                  color: '#0a0a0a',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  padding: '0.875rem 1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#f5f5f5',
                  textDecoration: 'none',
                }}
              >
                Go home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
