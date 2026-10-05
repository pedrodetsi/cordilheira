import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Céu: gradiente vertical (topo → meio → horizonte) como fundo da cena,
// sol/lua como sprite aditivo, estrelas na noite e nuvens conforme o clima.

function radialTexture(color) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, color)
  gr.addColorStop(0.25, color + 'aa')
  gr.addColorStop(1, color + '00')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Background({ sky }) {
  const { scene } = useThree()
  const key = sky.join()
  useEffect(() => {
    const c = document.createElement('canvas')
    c.width = 2
    c.height = 512
    const g = c.getContext('2d')
    const gr = g.createLinearGradient(0, 0, 0, 512)
    gr.addColorStop(0, sky[0])
    gr.addColorStop(0.55, sky[1])
    gr.addColorStop(1, sky[2])
    g.fillStyle = gr
    g.fillRect(0, 0, 2, 512)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    scene.background = t
    return () => {
      if (scene.background === t) scene.background = null
      t.dispose()
    }
  }, [key, scene])
  return null
}

function SunMoon({ sprite }) {
  const tex = useMemo(() => radialTexture(sprite.color), [sprite.color])
  useEffect(() => () => tex.dispose(), [tex])
  if (!sprite.opacity) return null
  return (
    <sprite position={sprite.position} scale={[sprite.scale, sprite.scale, 1]} renderOrder={-8}>
      <spriteMaterial
        map={tex}
        transparent
        depthWrite={false}
        fog={false}
        blending={THREE.AdditiveBlending}
        opacity={sprite.opacity}
      />
    </sprite>
  )
}

function Stars({ opacity }) {
  const geometry = useMemo(() => {
    const n = 1400
    const pos = new Float32Array(n * 3)
    const rnd = mulberry(1337)
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2
      const ph = Math.acos(rnd() * 0.92)
      const r = 380
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * r
      pos[i * 3 + 1] = Math.cos(ph) * r + 10
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  if (!opacity) return null
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#d6e6ff"
        size={1.6}
        sizeAttenuation={false}
        fog={false}
        transparent
        opacity={0.85 * opacity}
      />
    </points>
  )
}

// Nuvens: sprites macios à deriva, opacidade conforme o clima.
function Clouds({ opacity, color }) {
  const tex = useMemo(() => {
    const t = radialTexture('#ffffff')
    return t
  }, [])
  const puffs = useMemo(() => {
    const rnd = mulberry(9182)
    return Array.from({ length: 9 }, () => ({
      x: (rnd() - 0.5) * 260,
      y: 48 + rnd() * 36,
      z: -90 - rnd() * 110,
      s: 40 + rnd() * 40,
      speed: 0.15 + rnd() * 0.2,
    }))
  }, [])
  const grp = useRef()
  const op = useRef(0)
  useFrame((_, dt) => {
    op.current += (opacity - op.current) * 0.04
    if (!grp.current) return
    grp.current.visible = op.current > 0.02
    grp.current.children.forEach((sp, i) => {
      sp.position.x += puffs[i].speed * dt * 2
      if (sp.position.x > 160) sp.position.x = -160
      sp.material.opacity = op.current
    })
  })
  return (
    <group ref={grp} renderOrder={-7}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.55, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} fog={false} opacity={0} color={color} />
        </sprite>
      ))}
    </group>
  )
}

function mulberry(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function Sky({ env }) {
  return (
    <>
      <Background sky={env.sky} />
      <SunMoon sprite={env.sprite} />
      <Stars opacity={env.stars} />
      <Clouds opacity={env.cloudOpacity} color={env.cloudColor} />
    </>
  )
}
