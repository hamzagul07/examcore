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
        const subjectNames = (profile?.subjects ?? []).filter(
          (name): name is string => typeof name === 'string' && name.length > 0
        )
        if (!subjectNames.length) return

        const level = profile.level ?? 'A-Level'
        const next = subjectNames
          .map((name) => getSubjectById(name, level)?.code)
          .filter((c): c is string => Boolean(c))

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
