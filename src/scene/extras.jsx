import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { H_SCALE, ROW_SPACING } from '../lib/layout'
import { fmtKm } from '../lib/insights'
import soraSemi from '@fontsource/sora/files/sora-latin-600-normal.woff'

export const FONT_3D = soraSemi

const TREND_COLORS = { up: '#2e9e77', flat: '#5e9bc9', down: '#e08a56' }

// ── Trilha da tendência: fita luminosa que acompanha a média mensal,
//    margeando a cordilheira. Verde subindo, azul estável, âmbar caindo.
export function TrendRibbon({ monthly, rows, maxWidth, trend }) {
  const rowByKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows])
  const { tube, points } = useMemo(() => {
    const pts = monthly
      .map((m) => {
        const row = rowByKey.get(m.monthKey)
        if (!row) return null
        return new THREE.Vector3(
          maxWidth / 2 + 2.8,
          m.avg * H_SCALE + 0.35,
          row.z
        )
      })
      .filter(Boolean)
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5)
    return {
      tube: new THREE.TubeGeometry(curve, Math.max(pts.length * 6, 64), 0.08, 8, false),
      points: pts,
    }
  }, [monthly, rowByKey, maxWidth])

  const color = TREND_COLORS[trend.dir]
  return (
    <group>
      <mesh geometry={tube}>
        <meshBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.12, 12, 10]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ── Lençol de gelo: assinatura visual do platô. Uma placa translúcida
//    "congela" a faixa de corridas com distância estagnada.
export function PlateauSheet({ plateau, runs, layout }) {
  const ref = useRef()
  const { center, size, y } = useMemo(() => {
    const members = runs.slice(plateau.start, plateau.end + 1)
    let minZ = Infinity, maxZ = -Infinity, minX = Infinity, maxX = -Infinity
    for (const r of members) {
      const p = layout.pos.get(r.id)
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z)
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    }
    return {
      center: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
      size: [maxX - minX + 3.2, maxZ - minZ + ROW_SPACING * 0.9],
      y: plateau.medKm * H_SCALE + 0.22,
    }
  }, [plateau, runs, layout])

  useFrame((state) => {
    if (ref.current)
      ref.current.position.y = y + Math.sin(state.clock.elapsedTime * 0.7 + plateau.start) * 0.06
  })

  return (
    <group position={center}>
      <group ref={ref} position-y={y}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={size} />
          <meshPhysicalMaterial
            color="#bfe4f5"
            transparent
            opacity={0.32}
            roughness={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <Text
          font={FONT_3D}
          position={[0, 1.35, 0]}
          fontSize={0.58}
          color="#3d719f"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.025}
          outlineColor="#ffffff"
        >
          {`PLANALTO · ${plateau.count} corridas ≈ ${fmtKm(plateau.medKm)} km`}
        </Text>
      </group>
    </group>
  )
}

// ── Pico de cristal: a próxima meta, ainda não conquistada, além da última
//    fileira — o "próximo pico" literal.
export function GoalPeak({ goal, lastZ }) {
  const ref = useRef()
  const h = goal.goalKm * H_SCALE
  const z = lastZ + ROW_SPACING * 1.6
  const x = -5

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.25
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.2) * 0.015
      ref.current.scale.set(s, 1, s)
    }
  })

  return (
    <group position={[x, 0, z]}>
      <group ref={ref}>
        <mesh position-y={h / 2} scale={[1.35, h / 2, 1.35]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#6ecfe4"
            transparent
            opacity={0.5}
            roughness={0.05}
            metalness={0}
            emissive="#8fe3f2"
            emissiveIntensity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
      <mesh rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[1.7, 2.05, 48]} />
        <meshBasicMaterial color="#54b8d4" transparent opacity={0.5} />
      </mesh>
      <Text
        font={FONT_3D}
        position={[0, h + 0.8, 0]}
        fontSize={0.55}
        color="#1e7d9c"
        anchorX="center"
        outlineWidth={0.025}
        outlineColor="#ffffff"
      >
        {`PRÓXIMO PICO · ${fmtKm(goal.goalKm)} km`}
      </Text>
    </group>
  )
}

// ── Halo do recorde: brilho de sol atrás do pico mais alto.
export function RecordHalo({ x, z, height }) {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(255, 205, 112, 0.85)')
    grad.addColorStop(0.35, 'rgba(255, 190, 92, 0.35)')
    grad.addColorStop(1, 'rgba(255, 190, 92, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    const t = new THREE.CanvasTexture(canvas)
    return t
  }, [])
  const ref = useRef()
  useFrame((state) => {
    if (ref.current) {
      const s = 7 + Math.sin(state.clock.elapsedTime * 1.6) * 0.5
      ref.current.scale.set(s, s, 1)
    }
  })
  return (
    <sprite ref={ref} position={[x, height * 0.72, z]} renderOrder={-1}>
      <spriteMaterial map={texture} transparent depthWrite={false} opacity={0.9} />
    </sprite>
  )
}

// ── Marcos de ano na beirada do terreno.
export function YearMarkers({ rows, maxWidth }) {
  const marks = rows.filter((r, i) => i === 0 || r.month === 1)
  return marks.map((r) => (
    <Text
      key={r.key}
      font={FONT_3D}
      position={[-maxWidth / 2 - 3.4, 0.06, r.z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={1.5}
      color="#9db8cd"
      anchorX="right"
    >
      {String(r.year)}
    </Text>
  ))
}
