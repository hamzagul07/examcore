'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { ErrorBox, SuccessBox } from '@/components/AuthFormBits'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, message }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data?.error || 'Could not send your message.')
      return
    }

    setSuccessMsg('Message sent — we usually reply within 24–48 hours.')
    setName('')
    setEmail('')
    setMessage('')
  }

  return (
    <MarketingPageShell narrow>
      <MarketingHero
        label="CONTACT"
        title={<span className="gradient-text">Get in touch</span>}
        lead="Questions, feedback, or something broken? We'd like to hear from you."
      />

      <div className="space-y-8">
        <div className="ec-card p-6 sm:p-8">
          <p className="ec-label-tech mb-3">EMAIL</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-xl ec-link"
          >
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="ec-card p-6 sm:p-8">
          <p className="ec-label-tech mb-4">SEND A MESSAGE</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label-overline mb-2 block">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="ec-input"
                required
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor="email" className="label-overline mb-2 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="ec-input"
                required
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="message" className="label-overline mb-2 block">
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="How can we help?"
                className="ec-input min-h-[120px] resize-y"
                required
                minLength={10}
                maxLength={4000}
              />
            </div>

            {errorMsg && <ErrorBox message={errorMsg} />}
            {successMsg && <SuccessBox message={successMsg} />}

            <button
              type="submit"
              disabled={loading}
              className="ec-btn-primary flex w-full min-h-[48px] items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                'Send message'
              )}
            </button>
          </form>
        </div>
      </div>
    </MarketingPageShell>
  )
}
