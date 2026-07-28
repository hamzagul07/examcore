'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { NotationFigure as Figure } from '@/lib/courses/figures'

/**
 * ABC notation → engraved staves, optionally playable.
 *
 * IB Music sits at 0% visual coverage, and notation you can *hear* is the one
 * thing a static PDF of the syllabus can never do. Audio is only wired up when
 * the student presses play, so no AudioContext is created on page load.
 */
export function NotationFigure({ figure }: { figure: Figure }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [canPlay, setCanPlay] = useState(false)
  const tuneRef = useRef<unknown>(null)
  const synthRef = useRef<{ stop: () => void } | null>(null)
  const domId = useId().replace(/:/g, '')

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false

    void (async () => {
      try {
        const abcjs = await import('abcjs')
        if (cancelled || !hostRef.current) return
        const tunes = abcjs.renderAbc(hostRef.current, figure.abc, {
          responsive: 'resize',
          staffwidth: 480,
          paddingtop: 4,
          paddingbottom: 4,
        })
        tuneRef.current = tunes?.[0] ?? null
        if (figure.playable && tuneRef.current && abcjs.synth?.supportsAudio()) {
          setCanPlay(true)
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      synthRef.current?.stop()
    }
  }, [figure.abc, figure.playable])

  const togglePlay = useCallback(async () => {
    if (playing) {
      synthRef.current?.stop()
      setPlaying(false)
      return
    }
    try {
      const abcjs = await import('abcjs')
      const synth = new abcjs.synth.CreateSynth()
      const ctx = new AudioContext()
      await synth.init({ audioContext: ctx, visualObj: tuneRef.current as never })
      await synth.prime()
      synthRef.current = synth
      setPlaying(true)
      synth.start()
      // abcjs has no completion callback on start(), so clear the flag when the
      // tune's own duration elapses.
      const seconds = (tuneRef.current as { getTotalTime?: () => number })?.getTotalTime?.() ?? 0
      if (seconds > 0) window.setTimeout(() => setPlaying(false), seconds * 1000)
    } catch {
      setPlaying(false)
    }
  }, [playing])

  if (failed) return null

  return (
    <div className="lesson-figure-notation">
      <div
        ref={hostRef}
        id={domId}
        role="img"
        aria-label={figure.caption ? `${figure.title}. ${figure.caption}` : figure.title}
      />
      {canPlay ? (
        <button type="button" className="lesson-figure-play" onClick={() => void togglePlay()}>
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      ) : null}
    </div>
  )
}
