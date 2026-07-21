import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Celebração do recorde: quando o pico dourado termina de "nascer", dispara
// uma fonte de partículas douradas/brancas que sobem e viram neve caindo,
// junto de um flash de luz. Toca uma vez (na entrada / ao surgir novo recorde).
export default function RecordBurst({ position, height, startAt }) {
  const N = 150
  const points = useRef()
  const flash = useRef()
  const played = useRef(false)
  const life = useRef(0)

  const { geometry, parts } = useMemo(() => {
    const positions = new Float32Array(N * 3)
    const parts = []
    const rnd = mulberry(7)
    for (let i = 0; i < N; i++) {
      const ang = rnd() * Math.PI * 2
      const spread = rnd() * 2.4
      parts.push({
        vx: Math.cos(ang) * spread,
        vz: Math.sin(ang) * spread,
        vy: 5 + rnd() * 8,
        gold: rnd() > 0.45,
        sway: 0.5 + rnd(),
        phase: rnd() * 6.28,
      })
      positions[i * 3] = 0; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = 0
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const colors = new Float32Array(N * 3)
    const gold = new THREE.Color('#ffce6e'), white = new THREE.Color('#ffffff')
    for (let i = 0; i < N; i++) {
      const c = parts[i].gold ? gold : white
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return { geometry: g, parts }
  }, [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (!played.current) {
      if (t >= startAt) { played.current = true; life.current = 0 }
      else return
    }
    life.current += dt
    const L = life.current
    const d = Math.min(dt, 0.05)
    const pos = points.current.geometry.attributes.position.array
    for (let i = 0; i < N; i++) {
      const p = parts[i]
      p.vy -= 9.8 * d * 0.55 // gravidade suave
      pos[i * 3] += p.vx * d + Math.sin(t * p.sway + p.phase) * d * 0.6
      pos[i * 3 + 1] += p.vy * d
      pos[i * 3 + 2] += p.vz * d
      if (pos[i * 3 + 1] < -height) pos[i * 3 + 1] = -height
    }
    points.current.geometry.attributes.position.needsUpdate = true

    const fade = THREE.MathUtils.clamp(1 - L / 3.2, 0, 1)
    points.current.material.opacity = fade
    points.current.visible = fade > 0.01
    if (flash.current) flash.current.intensity = Math.max(0, 4 * (1 - L / 0.8))
  })

  return (
    <group position={[position[0], position[1] + height, position[2]]}>
      <points ref={points} geometry={geometry}>
        <pointsMaterial size={0.28} vertexColors transparent depthWrite={false} sizeAttenuation opacity={0} />
      </points>
      <pointLight ref={flash} color="#ffd98a" intensity={0} distance={22} />
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
