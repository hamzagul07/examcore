'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Home() {
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          whatsapp,
          subject_interest: 'A-Level Math',
        }),
      })

      const data = await response.json()
      setLoading(false)

      if (!response.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        return
      }

      setSubmitted(true)
    } catch (err) {
      setLoading(false)
      const message = err instanceof Error ? err.message : 'Network error'
      setErrorMsg(message)
    }
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="text-4xl font-bold">You are on the list.</h1>
          <p className="text-lg text-slate-700">
            Send PKR 100 to JazzCash {process.env.NEXT_PUBLIC_JAZZCASH_NUMBER} to lock in your spot.
          </p>
          <p className="text-slate-600">
            WhatsApp us once sent. We will confirm within 1 hour. Refundable if we do not ship in 8 weeks.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="px-6 py-20 max-w-4xl mx-auto text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          Stop waiting three days for your teacher.
        </h1>
        <h2 className="mt-6 text-2xl text-slate-700 font-medium">
          Mark your A-Level paper in 30 seconds. Exactly like the examiner would.
        </h2>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          AI-powered marking trained on Cambridge mark schemes. Built by an A-Level student, for A-Level students. Launching in 6 weeks for Pure Math 1.
        </p>
      </section>

      <section className="px-6 py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">You already know the problem.</h2>
          <ul className="space-y-4 text-lg text-slate-700">
            <li>Your teacher takes 3 days to return a paper. Sometimes a week.</li>
            <li>Self-marking takes 2 hours and you still do not know what marks you earned.</li>
            <li>ChatGPT marks your paper but it does not actually know the mark scheme.</li>
          </ul>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">30 seconds. Examiner-grade. Three steps.</h2>
          <ol className="space-y-6 text-lg text-slate-700">
            <li><strong>1. Snap your answer.</strong> One photo of any question you just attempted.</li>
            <li><strong>2. AI marks against the official mark scheme.</strong> M1, A1, B1, ECF tracked exactly like a Cambridge examiner.</li>
            <li><strong>3. See what you got wrong and what to study next.</strong> Real feedback in Urdu and English.</li>
          </ol>
        </div>
      </section>

      <section className="px-6 py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">First 100 students lock in early-access pricing.</h2>
          <p className="text-lg text-slate-700 mb-2">Normal: PKR 1,500 per month</p>
          <p className="text-2xl font-bold text-slate-900 mb-4">Early access: PKR 500 per month for 3 months</p>
          <p className="text-slate-600">
            PKR 100 deposit today, applied to your first month. Full refund if Examcore is not live in 8 weeks.
          </p>
        </div>
      </section>

      <section id="reserve" className="px-6 py-20 max-w-md mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-center">Reserve your spot</h2>
        <p className="text-slate-600 text-center mb-8">
          100 spots. PKR 100 refundable deposit.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="03XXXXXXXXX"
              className="mt-1"
            />
          </div>
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              {errorMsg}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Reserving...' : 'Reserve my spot'}
          </Button>
        </form>
      </section>
    </main>
  )
}