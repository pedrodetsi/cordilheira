import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Chuva: segmentos de linha caindo com leve inclinação, recicladas no topo.
// Só é montada quando intensity > 0. Centralizada no alvo da câmera.
export default function Rain({ intensity, center }) {
  const count = Math.round(900 * intensity)
  const ref = useRef()

  const { geometry, drops } = useMemo(() => {
    const positions = new Float32Array(count * 2 * 3)
    const drops = []
    const rnd = mulberry(4423)
    for (let i = 0; i < count; i++) {
      const x = (rnd() - 0.5) * 90
      const y = rnd() * 55
      const z = (rnd() - 0.5) * 120
      const len = 0.5 + rnd() * 0.5
      const v = 34 + rnd() * 20
      drops.push({ x, y, z, len, v })
      const o = i * 6
      positions[o] = x; positions[o + 1] = y; positions[o + 2] = z
      positions[o + 3] = x + 0.15; positions[o + 4] = y - len; positions[o + 5] = z
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return { geometry: g, drops }
  }, [count])

  useFrame((_, dt) => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position
    const arr = pos.array
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < drops.length; i++) {
      const dp = drops[i]
      dp.y -= dp.v * d
      if (dp.y < 0) dp.y += 55
      const o = i * 6
      arr[o + 1] = dp.y
      arr[o + 4] = dp.y - dp.len
    }
    pos.needsUpdate = true
  })

  if (count === 0) return null
  return (
    <lineSegments ref={ref} geometry={geometry} position={center} renderOrder={5}>
      <lineBasicMaterial color="#c3d6e6" transparent opacity={0.42} depthWrite={false} />
    </lineSegments>
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
