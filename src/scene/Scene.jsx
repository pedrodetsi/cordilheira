import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo } from 'react'
import Peak from './Peak'
import { SkyDome, TrendRibbon, PlateauSheet, GoalPeak, RecordHalo, YearMarkers } from './extras'
import { H_SCALE } from '../lib/layout'

export default function Scene({
  runs, layout, matchedIds, selectedId, onSelect, onHover,
  plateaus, monthly, trend, goal, record,
}) {
  const recordPos = layout.pos.get(record.id)
  const narrow = typeof window !== 'undefined' && window.innerWidth < 700
  const camZ = layout.lastZ + (narrow ? 52 : 30)
  const camY = narrow ? 26 : 19
  const camFov = narrow ? 46 : 42
  const growDelays = useMemo(
    () => new Map(runs.map((r, i) => [r.id, 0.15 + i * 0.012])),
    [runs]
  )

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [4, camY, camZ], fov: camFov, near: 0.5, far: 700 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <fog attach="fog" args={['#e9f2f8', 80, 230]} />
      <SkyDome />

      <hemisphereLight args={['#dceefb', '#f5efe2', 0.85]} />
      <directionalLight position={[30, 24, 60]} intensity={1.25} color="#ffe3b8" />
      <directionalLight position={[-40, 30, -30]} intensity={0.35} color="#cfe6f7" />

      {/* chão de gelo */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.02}>
        <planeGeometry args={[640, 640]} />
        <meshStandardMaterial color="#edf4f9" roughness={1} />
      </mesh>

      {runs.map((r) => {
        const p = layout.pos.get(r.id)
        return (
          <Peak
            key={r.id}
            run={r}
            x={p.x}
            z={p.z}
            isRecord={r.id === record.id}
            matched={matchedIds.has(r.id)}
            selected={r.id === selectedId}
            onSelect={onSelect}
            onHover={onHover}
            growDelay={growDelays.get(r.id)}
          />
        )
      })}

      <RecordHalo x={recordPos.x} z={recordPos.z} height={record.km * H_SCALE} />
      {plateaus.map((p) => (
        <PlateauSheet key={p.start} plateau={p} runs={runs} layout={layout} />
      ))}
      <TrendRibbon monthly={monthly} rows={layout.rows} maxWidth={layout.maxWidth} trend={trend} />
      <GoalPeak goal={goal} lastZ={layout.lastZ} />
      <YearMarkers rows={layout.rows} maxWidth={layout.maxWidth} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 2.5, layout.lastZ * 0.12]}
        minDistance={8}
        maxDistance={190}
        maxPolarAngle={1.5}
      />
    </Canvas>
  )
}
