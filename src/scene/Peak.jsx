import { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makePeakGeometry, hashSeed } from './peakGeometry'
import { H_SCALE } from '../lib/layout'

const COLORS = {
  base: '#7fa3c6',
  tip: '#fbfdff',
  recordBase: '#d98f2e',
  recordTip: '#ffedc9',
}

export default function Peak({
  run, x, z, isRecord, matched, selected,
  onSelect, onHover, growDelay,
}) {
  const mesh = useRef()
  const matRef = useRef()
  const [hovered, setHovered] = useState(false)
  const height = Math.max(run.km * H_SCALE, 0.15)
  const radius = 0.95 + run.km * 0.055
  // ganho de elevação por km → rugosidade (satura em ~25 m/km); asfalto ≈ 0
  const ruggedness = THREE.MathUtils.clamp((run.elevPerKm ?? 0) / 25, 0, 1)

  const geometry = useMemo(
    () =>
      makePeakGeometry({
        seed: hashSeed(run.id),
        radius,
        height,
        baseColor: isRecord ? COLORS.recordBase : COLORS.base,
        tipColor: isRecord ? COLORS.recordTip : COLORS.tip,
        ruggedness,
        rock: !isRecord,
      }),
    [run.id, radius, height, isRecord, ruggedness]
  )
  useEffect(() => () => geometry.dispose(), [geometry])

  const t0 = useRef(null)
  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    if (t0.current == null) t0.current = state.clock.elapsedTime
    const el = state.clock.elapsedTime - t0.current - growDelay
    const p = THREE.MathUtils.clamp(el / 1.1, 0, 1)
    // easeOutBack suave: nasce do chão com leve "respiro"
    const k = 1.25
    const e = p === 1 ? 1 : 1 + (k + 1) * Math.pow(p - 1, 3) + k * Math.pow(p - 1, 2)
    const target = height * Math.max(e, 0.001)
    m.scale.y += (target - m.scale.y) * 0.35
    m.visible = p > 0

    const mat = matRef.current
    if (mat) {
      const glow = isRecord
        ? 0.32 + Math.sin(state.clock.elapsedTime * 1.6) * 0.14
        : 0
      const want = hovered || selected ? glow + 0.35 : glow
      mat.emissiveIntensity += (want - mat.emissiveIntensity) * 0.18
      const wantOp = matched ? 1 : 0.13
      mat.opacity += (wantOp - mat.opacity) * 0.15
    }
  })

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={mesh}
        geometry={geometry}
        scale={[1, 0.001, 1]}
        onClick={(e) => {
          if (!matched) return
          e.stopPropagation()
          onSelect(run)
        }}
        onPointerOver={(e) => {
          if (!matched) return
          e.stopPropagation()
          setHovered(true)
          onHover(run)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          onHover(null)
          document.body.style.cursor = 'auto'
        }}
      >
        <meshStandardMaterial
          ref={matRef}
          vertexColors
          flatShading
          roughness={0.85}
          metalness={0}
          transparent
          emissive={isRecord ? '#ffb648' : '#bfe0ff'}
          emissiveIntensity={0}
        />
      </mesh>

      {/* marco dourado: foi recorde pessoal na época */}
      {run.wasPR && (
        <mesh position={[0, height + 0.42, 0]} scale={isRecord ? 1.7 : 1}>
          <octahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial
            color="#f2b544"
            emissive="#ffcf70"
            emissiveIntensity={0.9}
            roughness={0.25}
            transparent
            opacity={matched ? 1 : 0.1}
          />
        </mesh>
      )}

      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.04, 0]}>
          <ringGeometry args={[radius + 0.25, radius + 0.45, 40]} />
          <meshBasicMaterial color="#2e86c1" transparent opacity={0.65} />
        </mesh>
      )}
    </group>
  )
}
