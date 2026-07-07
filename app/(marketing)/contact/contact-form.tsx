'use client'

import { useState } from 'react'
import { ButtonLoadingState } from '@/components/ui/ButtonLoadingState'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { HONEYPOT_FIELD } from '@/lib/honeypot'
import { FormErrorAlert } from '@/components/ui/FormErrorAlert'
import { MarketingHero, MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { SuccessBox } from '@/components/AuthFormBits'

export function ContactForm({ geoSection }: { geoSection?: React.ReactNode }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
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
      body: JSON.stringify({ name, email, message, [HONEYPOT_FIELD]: honeypot }),
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
    <MarketingPageShell narrow className="ms-contact-page">
      <MarketingHero
        label="CONTACT"
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
        title="Get in touch"
        lead="Questions, feedback, or something broken? We'd like to hear from you. Check the FAQ first — many answers are already there."
      />

      <div className="ms-pg space-y-8 pb-16">
        {geoSection}
        <div className="ms-dash-card">
          <p className="ms-overline">Email</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="ec-btn-underline text-xl">
            {CONTACT_EMAIL}
          </a>
        </div>

        <div className="ms-dash-card">
          <p className="ms-overline">Send a message</p>
          <form onSubmit={handleSubmit} className="relative space-y-4">
            <input
              type="text"
              name={HONEYPOT_FIELD}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] h-0 w-0 opacity-0"
            />
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

            {errorMsg && <FormErrorAlert message={errorMsg} />}
            {successMsg ? (
              <div role="status">
                <SuccessBox message={successMsg} />
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="ec-btn-primary flex w-full min-h-[48px] items-center justify-center gap-2"
            >
              {loading ? (
                <ButtonLoadingState mode="morph" loadingText="Sending…">
                  Send message
                </ButtonLoadingState>
              ) : (
                'Send message'
              )}
            </button>
          </form>
        </div>

        <PageHelpStrip />
      </div>
    </MarketingPageShell>
  )
}
