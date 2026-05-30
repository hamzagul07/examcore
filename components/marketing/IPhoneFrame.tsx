'use client'

import Image from 'next/image'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import type { DeviceFrameProps } from './DeviceFrame'

export function IPhoneFrame({
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
    <div
      ref={ref}
      className={`mx-auto w-full max-w-[320px] ${className ?? ''}`}
    >
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
        {/* Phone body */}
        <div
          style={{
            borderRadius: '44px',
            border: '2px solid var(--ec-border)',
            background: 'var(--ec-surface-raised)',
            padding: '12px 8px',
            boxShadow: 'var(--ec-card-shadow)',
            position: 'relative',
          }}
        >
          {/* Dynamic island / notch pill */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '10px',
                borderRadius: '9999px',
                background: 'var(--ec-surface)',
                border: '1px solid var(--ec-border)',
                opacity: 0.8,
              }}
            />
          </div>

          {/* Screen area — 9:19.5 */}
          <div
            style={{
              aspectRatio: '9 / 19.5',
              borderRadius: '28px',
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
              sizes="(max-width: 480px) 80vw, 320px"
            />
          </div>

          {/* Home indicator pill */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                width: '36%',
                height: '5px',
                borderRadius: '9999px',
                background: 'var(--ec-border)',
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
