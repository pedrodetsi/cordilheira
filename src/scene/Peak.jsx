import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makePeakGeometry } from './peakGeometry'
import { H_SCALE } from '../lib/layout'

const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const RECORD_SNOW = '#fff3d6'

export default function Peak({
  run, x, z, isRecord, matched, palette, shadows, delay, onSelect,
}) {
  const mesh = useRef()
  const mat = useRef()
  const diamond = useRef()
  const [hovered, setHovered] = useState(false)
  const h = Math.max(0.35, run.km * H_SCALE)
  const rugged = run.elevPerKm >= 15

  const geometry = useMemo(() => {
    const pal = isRecord
      ? { base: palette.goldDeep, mid: palette.gold, snow: RECORD_SNOW }
      : palette
    return makePeakGeometry(palette, h, rugged, run.i * 7.13, pal)
  }, [palette, h, rugged, run.i, isRecord])
  useEffect(() => () => geometry.dispose(), [geometry])

  const t0 = useRef(null)
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t0.current == null) t0.current = t
    const el = t - t0.current
    const m = mesh.current
    if (m) m.scale.y = Math.max(0.001, easeOut(THREE.MathUtils.clamp((el - delay) / 0.9, 0, 1)))

    const mt = mat.current
    if (mt) {
      const baseEm = isRecord ? palette.goldEm : 0
      const want = hovered ? baseEm + 0.25 : baseEm
      mt.emissiveIntensity += (want - mt.emissiveIntensity) * 0.2
      const wantOp = matched ? 1 : 0.14
      mt.opacity += (wantOp - mt.opacity) * 0.15
      const transp = mt.opacity < 0.995
      if (transp !== mt.transparent) {
        mt.transparent = transp
        mt.depthWrite = !transp
        mt.needsUpdate = true
      }
    }

    const d = diamond.current
    if (d) {
      d.visible = el > delay + 0.9
      d.position.y = h + 0.65 + Math.sin(t * 1.6 + run.i) * 0.12
      d.rotation.y = t * 1.2
    }
  })

  return (
    <group position={[x, 0, z]}>
      <mesh
        ref={mesh}
        geometry={geometry}
        scale={[1, 0.001, 1]}
        castShadow={shadows}
        receiveShadow={shadows}
        onClick={(e) => {
          if (!matched || e.delta > 6) return
          e.stopPropagation()
          onSelect(run)
        }}
        onPointerOver={(e) => {
          if (!matched) return
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {isRecord ? (
          <meshStandardMaterial
            ref={mat}
            vertexColors
            flatShading
            roughness={0.55}
            metalness={0.1}
            emissive={palette.gold}
            emissiveIntensity={palette.goldEm}
          />
        ) : (
          <meshStandardMaterial
            ref={mat}
            vertexColors
            flatShading
            roughness={palette.rough}
            metalness={0}
            emissive="#ffffff"
            emissiveIntensity={0}
          />
        )}
      </mesh>

      {/* losango dourado: foi recorde pessoal na época */}
      {run.wasPR && !isRecord && (
        <mesh ref={diamond} position-y={h + 0.65} visible={false}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial
            color={palette.gold}
            emissive={palette.gold}
            emissiveIntensity={palette.glowy ? 1.2 : 0.35}
            flatShading
            transparent={!matched}
            opacity={matched ? 1 : 0.15}
          />
        </mesh>
      )}
    </group>
  )
}
