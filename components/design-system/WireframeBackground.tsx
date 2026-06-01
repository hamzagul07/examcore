'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import * as THREE from 'three'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import {
  getWireframePaused,
  subscribeWireframePause,
} from '@/lib/dashboard/wireframe-pause'

/**
 * Signature wireframe lattice background — visible on every page at low contrast.
 */
export function WireframeBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useEcTheme()
  const pathname = usePathname()
  const pausedRef = useRef(getWireframePaused())

  useEffect(() => {
    return subscribeWireframePause(() => {
      pausedRef.current = getWireframePaused()
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100)
    camera.position.z = 8

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const group = new THREE.Group()
    const isZen = theme === 'zen'
    const lineColor = isZen
      ? new THREE.Color(0.35, 0.6, 0.42)
      : new THREE.Color(0, 0.96, 0.63)

    const icoGeo = new THREE.IcosahedronGeometry(2.4, 1)
    const icoMat = new THREE.MeshBasicMaterial({
      color: lineColor,
      wireframe: true,
      transparent: true,
      opacity: isZen ? 0.2 : 0.35,
    })
    const ico = new THREE.Mesh(icoGeo, icoMat)
    group.add(ico)

    const dodeGeo = new THREE.DodecahedronGeometry(1.5, 0)
    const dodeMat = new THREE.MeshBasicMaterial({
      color: lineColor,
      wireframe: true,
      transparent: true,
      opacity: isZen ? 0.15 : 0.25,
    })
    const dode = new THREE.Mesh(dodeGeo, dodeMat)
    dode.position.set(3.5, -1, -1)
    group.add(dode)

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(5.5, 5.5, 5.5))
    const edgeMat = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: isZen ? 0.08 : 0.15,
    })
    const edgeLines = new THREE.LineSegments(edges, edgeMat)
    group.add(edgeLines)

    scene.add(group)

    let frame = 0
    let raf = 0
    const speed = isZen ? 0.002 : 0.004

    const animate = () => {
      if (!pausedRef.current && pathname !== '/dashboard') {
        frame += speed
        ico.rotation.x = frame * 0.7
        ico.rotation.y = frame
        dode.rotation.z = -frame * 0.5
        edgeLines.rotation.y = frame * 0.3
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [theme, pathname])

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
      style={{ opacity: 'var(--ec-wireframe-opacity)' }}
      aria-hidden
    />
  )
}
