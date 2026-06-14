'use client'

import { motion } from 'framer-motion'
import { getSubjectById } from '@/lib/profile-options'
import { getSubjectColor } from '@/lib/design-system/subject-colors'
import { LoadingLink } from '@/components/ui/LoadingLink'

type SubjectChip = {
  name: string
  code: string | null
}

type Props = {
  subjects: SubjectChip[]
  title?: string
}

export function ActiveSubjects({ subjects, title = 'Subjects active' }: Props) {
  if (subjects.length === 0) return null

  return (
    <section className="ms-active-subjects mb-8">
      <h2 className="text-title mb-4">{title}</h2>
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_90%,transparent)] lg:[mask-image:none]">
        {subjects.map(({ name, code }) => {
          const href = code
            ? `/dashboard/progress?subject=${encodeURIComponent(code)}`
            : '/dashboard/progress'
          const meta = getSubjectById(name)
          const dotColor = getSubjectColor(code)

          return (
            <motion.div
              key={name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="shrink-0"
            >
              <LoadingLink
                href={href}
                variant="inline"
                className="ec-chip ec-chip-info inline-flex min-h-[44px] items-center gap-2 px-4 py-2.5 text-sm"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: dotColor }}
                  aria-hidden
                />
                <span className="font-semibold">{meta?.label ?? name}</span>
              </LoadingLink>
            </motion.div>
          )
        })}
        </div>
      </div>
    </section>
  )
}
