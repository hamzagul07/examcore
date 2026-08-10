'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { getSubjectById } from '@/lib/profile-options'

/**
 * Load the signed-in student's chosen subject codes (profile order).
 * Empty for guests or profiles with no subjects set — callers keep catalog order.
 */
export function usePreferredSubjectCodes(): string[] {
  const [codes, setCodes] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user || cancelled) return

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('subjects, level')
          .eq('id', user.id)
          .maybeSingle()

        // Only pin subjects the student actually chose — not board defaults.
        // Supabase types `subjects` loosely; narrow explicitly for noImplicitAny.
        const rawSubjects = Array.isArray(profile?.subjects)
          ? (profile.subjects as unknown[])
          : []
        const subjectNames: string[] = []
        for (const item of rawSubjects) {
          if (typeof item === 'string' && item.length > 0) subjectNames.push(item)
        }
        if (!subjectNames.length) return

        const level =
          typeof profile?.level === 'string' && profile.level
            ? profile.level
            : 'A-Level'
        const next: string[] = []
        for (const name of subjectNames) {
          const code = getSubjectById(name, level)?.code
          if (code) next.push(code)
        }

        if (!cancelled) setCodes(next)
      } catch {
        /* guests / offline — keep catalog order */
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return codes
}
