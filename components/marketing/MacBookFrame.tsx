'use client'

import Image from 'next/image'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import type { DeviceFrameProps } from './DeviceFrame'

export function MacBookFrame({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: DeviceFrameProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReducedMotion = useReducedMotion()

  const restRotateY = -3
  const restRotateX = 2

  const animateVariants = prefersReducedMotion
    ? { rotateY: restRotateY, rotateX: restRotateX }
    : {
        rotateY: isInView ? [restRotateY, -6, restRotateY] : restRotateY,
        rotateX: isInView ? [restRotateX, 4, restRotateX] : restRotateX,
      }

  return (
    <div ref={ref} className={`w-full max-w-3xl mx-auto ${className ?? ''}`}>
      <motion.div
        animate={animateVariants}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { duration: 0.9, ease: 'easeOut' }
        }
        style={{
          perspective: 1200,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Screen lid */}
        <div
          style={{
            borderRadius: '12px 12px 0 0',
            border: '2px solid var(--ec-border)',
            background: 'var(--ec-surface-raised)',
            padding: '6px',
            boxShadow: 'var(--ec-card-shadow)',
          }}
        >
          {/* Screen area — 16:10 */}
          <div
            style={{
              aspectRatio: '16 / 10',
              borderRadius: '8px',
              overflow: 'hidden',
              background:
                'color-mix(in srgb, var(--ec-brand) 4%, var(--ec-surface))',
              boxShadow:
                'inset 0 0 0 1px var(--ec-border), inset 0 2px 12px rgba(0,0,0,0.15)',
              position: 'relative',
            }}
          >
            <Image
              src={src}
              alt={alt}
              width={width}
              height={height}
              priority={priority}
              className="h-full w-full"
              style={{ objectFit: 'contain' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 768px"
            />
          </div>
        </div>

        {/* Hinge line */}
        <div
          style={{
            height: '3px',
            background: 'var(--ec-border)',
            borderLeft: '2px solid var(--ec-border)',
            borderRight: '2px solid var(--ec-border)',
          }}
        />

        {/* Base / keyboard */}
        <div
          style={{
            height: '28px',
            borderRadius: '0 0 8px 8px',
            border: '2px solid var(--ec-border)',
            borderTop: 'none',
            background: 'var(--ec-surface-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Trackpad notch hint */}
          <div
            style={{
              width: '14%',
              height: '6px',
              borderRadius: '3px',
              border: '1px solid var(--ec-border)',
              background: 'transparent',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Foot — slight trapezoid via clip / border trick */}
        <div
          style={{
            height: '4px',
            marginTop: '0',
            borderRadius: '0 0 4px 4px',
            background: 'var(--ec-border)',
            marginLeft: '4%',
            marginRight: '4%',
          }}
        />
      </motion.div>
    </div>
  )
}
