'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { DeviceTier } from '@/lib/hooks/useDeviceTier'

export type BookSceneHandle = {
  setOpen: (open: boolean) => void
  setPageTexture: (url: string) => void
  setTilt: (x: number, y: number) => void
  dispose: () => void
}

type InitOptions = {
  container: HTMLElement
  tier: DeviceTier
  reduceMotion: boolean
}

export function createBookScene(opts: InitOptions): BookSceneHandle {
  const { container, tier, reduceMotion } = opts
  const width = container.clientWidth
  const height = container.clientHeight

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(0, 0.2, 4.2)

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: tier !== 'low' })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'high' ? 1.5 : 1))
  container.appendChild(renderer.domElement)

  const book = new THREE.Group()
  scene.add(book)

  const coverMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1a1d26'),
    roughness: 0.92,
    metalness: 0,
  })
  const spineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00f5a0'),
    roughness: 0.8,
  })
  const pageMat = new THREE.MeshStandardMaterial({
    color: '#faf7f2',
    roughness: 1,
  })

  const coverGeo = new THREE.BoxGeometry(2.4, 3.2, 0.12)
  const cover = new THREE.Mesh(coverGeo, coverMat)
  cover.position.z = 0.06
  book.add(cover)

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.2, 0.14), spineMat)
  spine.position.x = -1.27
  book.add(spine)

  const pagePlane = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), pageMat)
  pagePlane.position.set(0, 0, 0.02)
  book.add(pagePlane)

  const amb = new THREE.AmbientLight(0xffffff, 0.65)
  const dir = new THREE.DirectionalLight(0xfff5e6, 0.85)
  dir.position.set(2, 4, 5)
  scene.add(amb, dir)

  let openAmount = 0
  let targetOpen = 0
  let tiltX = 0
  let tiltY = 0
  let raf = 0
  let visible = true

  const textureLoader = new THREE.TextureLoader()

  const animate = () => {
    if (!visible) {
      raf = requestAnimationFrame(animate)
      return
    }
    openAmount += (targetOpen - openAmount) * (reduceMotion ? 1 : 0.08)
    book.rotation.y = -openAmount * 0.85 + tiltY
    book.rotation.x = tiltX
    cover.rotation.y = -openAmount * 0.3
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

  const onVis = () => {
    visible = !document.hidden
  }
  document.addEventListener('visibilitychange', onVis)

  return {
    setOpen(open: boolean) {
      targetOpen = open ? 1 : 0
    },
    setPageTexture(url: string) {
      textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        pageMat.map = tex
        pageMat.needsUpdate = true
      })
    },
    setTilt(x: number, y: number) {
      tiltX = x
      tiltY = y
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}

export function BookSceneCanvas({
  tier,
  reduceMotion,
  isOpen,
  pageTexture,
  tilt,
}: {
  tier: DeviceTier
  reduceMotion: boolean
  isOpen: boolean
  pageTexture: string | null
  tilt: { x: number; y: number }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<BookSceneHandle | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const scene = createBookScene({
      container: ref.current,
      tier,
      reduceMotion,
    })
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [tier, reduceMotion])

  useEffect(() => {
    sceneRef.current?.setOpen(isOpen)
  }, [isOpen])

  useEffect(() => {
    if (pageTexture) sceneRef.current?.setPageTexture(pageTexture)
  }, [pageTexture])

  useEffect(() => {
    sceneRef.current?.setTilt(tilt.x, tilt.y)
  }, [tilt.x, tilt.y])

  return (
    <div
      ref={ref}
      className="mx-auto aspect-[4/3] w-[min(92vw,520px)]"
      aria-hidden
    />
  )
}
