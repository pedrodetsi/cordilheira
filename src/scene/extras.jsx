import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { H_SCALE, ROW_SPACING } from '../lib/layout'
import { makePeakGeometry } from './peakGeometry'
import soraSemi from '@fontsource/sora/files/sora-latin-600-normal.woff'

export const FONT_3D = soraSemi

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

// ── Trilha da média mensal: tubo na lateral da cordilheira.
export function TrendRibbon({ monthly, rows, maxWidth, palette }) {
  const tube = useMemo(() => {
    const avg = new Map(monthly.map((m) => [m.monthKey, m.avg]))
    const pts = rows
      .filter((r) => avg.has(r.key))
      .map((r) => new THREE.Vector3(-(maxWidth / 2 + 3.2), avg.get(r.key) * H_SCALE, r.z))
    if (pts.length < 2) return null
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 6, 0.08, 6, false)
  }, [monthly, rows, maxWidth])
  useEffect(() => () => tube?.dispose(), [tube])
  if (!tube) return null
  return (
    <mesh geometry={tube}>
      <meshStandardMaterial
        color={palette.trend}
        emissive={palette.trend}
        emissiveIntensity={palette.glowy ? 0.9 : 0.25}
      />
    </mesh>
  )
}

// ── Próximo pico: pico-fantasma translúcido com arestas + cristal flutuante,
//    além da última fileira.
export function GoalPeak({ goal, lastZ, palette }) {
  const crystal = useRef()
  const gH = goal.goalKm * H_SCALE
  const gz = lastZ + ROW_SPACING * 1.6
  const { geo, edges } = useMemo(() => {
    const geo = makePeakGeometry(
      { ...palette, jitter: 0.06, snowAbs: null, snowFrom: 2 }, gH, false, 99,
      { base: palette.goal, mid: palette.goal, snow: palette.goal }
    )
    return { geo, edges: new THREE.EdgesGeometry(geo, 20) }
  }, [palette, gH])
  useEffect(() => () => { geo.dispose(); edges.dispose() }, [geo, edges])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (crystal.current) {
      crystal.current.rotation.y = t * 0.8
      crystal.current.position.y = gH + 1 + Math.sin(t * 1.4) * 0.2
    }
  })

  return (
    <group position={[0, 0, gz]}>
      <mesh geometry={geo}>
        <meshStandardMaterial
          color={palette.goal}
          emissive={palette.goal}
          emissiveIntensity={palette.glowy ? 0.55 : 0.2}
          transparent
          opacity={0.2}
          depthWrite={false}
          flatShading
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={palette.goal} transparent opacity={0.85} />
      </lineSegments>
      <mesh ref={crystal} position-y={gH + 1} scale={[1, 1.6, 1]}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color={palette.goal}
          emissive={palette.goal}
          emissiveIntensity={palette.glowy ? 1.3 : 0.5}
          flatShading
        />
      </mesh>
    </group>
  )
}

// ── Halo do recorde: anel dourado pulsante sobre o pico; na noite, brilho
//    aditivo + luz pontual.
export function RecordHalo({ x, z, height, palette, showAt }) {
  const ring = useRef()
  const glow = useRef()
  const t0 = useRef(null)
  const tex = useMemo(() => (palette.glow ? radialTexture(palette.gold) : null), [palette])
  useEffect(() => () => tex?.dispose(), [tex])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (t0.current == null) t0.current = t
    const on = t - t0.current > showAt
    if (ring.current) {
      ring.current.visible = on
      const s = 1 + Math.sin(t * 2.2) * 0.08
      ring.current.scale.set(s, s, s)
      ring.current.material.opacity = 0.65 + Math.sin(t * 2.2) * 0.25
    }
    if (glow.current) {
      glow.current.visible = on
      const s = 6 + Math.sin(t * 2.2) * 0.8
      glow.current.scale.set(s, s, 1)
    }
  })

  return (
    <group position={[x, 0, z]}>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={height + 0.5} visible={false}>
        <ringGeometry args={[1.0, 1.14, 64]} />
        <meshBasicMaterial
          color={palette.gold}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      {palette.glow && (
        <>
          <sprite ref={glow} position-y={height + 0.2} visible={false}>
            <spriteMaterial
              map={tex}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              fog={false}
            />
          </sprite>
          <pointLight color={palette.gold} intensity={30} distance={14} decay={2} position-y={height + 1.2} />
        </>
      )}
    </group>
  )
}

// ── Anel de seleção girando sobre o pico escolhido.
export function SelectRing({ x, z, height, color }) {
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) ref.current.rotation.z = state.clock.elapsedTime
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[x, height + 0.35, z]}>
      <ringGeometry args={[0.62, 0.8, 48]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.95}
        side={THREE.DoubleSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}

// ── Marcos de ano na beirada do terreno.
export function YearMarkers({ rows, maxWidth, color }) {
  const marks = rows.filter((r, i) => i === 0 || r.month === 1)
  return marks.map((r) => (
    <Text
      key={r.key}
      font={FONT_3D}
      position={[maxWidth / 2 + 3.4, 0.08, r.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={1.5}
      color={color}
      anchorX="left"
    >
      {String(r.year)}
    </Text>
  ))
}
