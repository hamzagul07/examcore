'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight } from 'lucide-react'

export default function JoinPage() {
  const router = useRouter()
  const [code, setCode] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <div className="ec-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
          <BookOpen className="h-8 w-8 text-emerald-400" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Join a classroom</h1>
        <p className="mb-8 text-slate-400">
          Enter the invite code your teacher gave you.
        </p>

        <form onSubmit={submit}>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/\s/g, ''))
            }
            placeholder="e.g. A3F9B2D1"
            maxLength={8}
            className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center font-mono text-2xl tracking-widest text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="ec-btn-primary inline-flex w-full items-center justify-center gap-2"
            disabled={code.length < 4}
          >
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
