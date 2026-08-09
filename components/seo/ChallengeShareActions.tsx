'use client'

import { ToolShareActions } from '@/components/tools/ToolShareActions'
import { buildToolSlipText } from '@/lib/tools/tool-slip'

type Props = {
  title: string
  score: number
  total: number
  challengePath: string
}

/** Client share strip for the challenge slip (needs clipboard / WA / native share). */
export function ChallengeShareActions({ title, score, total, challengePath }: Props) {
  const url = `https://markscheme.app${challengePath}`
  const text = buildToolSlipText([
    'MarkScheme · Quiz challenge',
    title,
    `Score to beat: ${score}/${total}`,
    'Can you beat it?',
    url,
  ])

  return (
    <ToolShareActions
      title={`MarkScheme · Beat ${score}/${total}`}
      url={url}
      text={text}
      copyLabel="Copy challenge"
      className="mt-5"
    />
  )
}
