import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import Peak from './Peak'
import Sky from './Sky'
import Rain from './Rain'
import Terrain from './Terrain'
import RecordBurst from './RecordBurst'
import { TrendRibbon, PlateauSheet, GoalPeak, RecordHalo, YearMarkers } from './extras'
import { H_SCALE } from '../lib/layout'

// Luzes e névoa dirigidas pelo ambiente (dia/noite × clima), lerpadas suave.
function Environment({ env }) {
  const hemi = useRef()
  const sun = useRef()
  const fill = useRef()
  const { scene } = useThree()
  const fog = useMemo(() => new THREE.Fog(env.fog.color, env.fog.near, env.fog.far), [])
  scene.fog = fog

  useFrame(() => {
    if (hemi.current) {
      hemi.current.color.lerp(_t.set(env.hemi.sky), 0.05)
      hemi.current.groundColor.lerp(_t2.set(env.hemi.ground), 0.05)
      hemi.current.intensity += (env.hemi.intensity - hemi.current.intensity) * 0.05
    }
    if (sun.current) {
      sun.current.color.lerp(_t3.set(env.sun.color), 0.05)
      sun.current.intensity += (env.sun.intensity - sun.current.intensity) * 0.05
      sun.current.position.lerp(_v.set(...env.sun.position), 0.05)
    }
    if (fill.current) {
      fill.current.color.lerp(_t4.set(env.fill.color), 0.05)
      fill.current.intensity += (env.fill.intensity - fill.current.intensity) * 0.05
    }
    fog.color.lerp(_t5.set(env.fog.color), 0.05)
    fog.near += (env.fog.near - fog.near) * 0.05
    fog.far += (env.fog.far - fog.far) * 0.05
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={[env.hemi.sky, env.hemi.ground, env.hemi.intensity]} />
      <directionalLight ref={sun} position={env.sun.position} intensity={env.sun.intensity} color={env.sun.color} />
      <directionalLight ref={fill} position={[-40, 30, -30]} intensity={env.fill.intensity} color={env.fill.color} />
    </>
  )
}
const _t = new THREE.Color(), _t2 = new THREE.Color(), _t3 = new THREE.Color()
const _t4 = new THREE.Color(), _t5 = new THREE.Color(), _v = new THREE.Vector3()

export default function Scene({
  runs, layout, matchedIds, selectedId, onSelect, onHover,
  plateaus, monthly, trend, goal, record, env,
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
  const recordHeight = record.km * H_SCALE

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [4, camY, camZ], fov: camFov, near: 0.5, far: 700 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true }}
    >
      <Environment env={env} />
      <Sky env={env} />
      <Terrain env={env} layout={layout} />

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

      <RecordHalo x={recordPos.x} z={recordPos.z} height={recordHeight} />
      <RecordBurst
        position={[recordPos.x, 0, recordPos.z]}
        height={recordHeight}
        startAt={(growDelays.get(record.id) ?? 0) + 1.25}
      />
      {plateaus.map((p) => (
        <PlateauSheet key={p.start} plateau={p} runs={runs} layout={layout} />
      ))}
      <TrendRibbon monthly={monthly} rows={layout.rows} maxWidth={layout.maxWidth} trend={trend} />
      <GoalPeak goal={goal} lastZ={layout.lastZ} />
      <YearMarkers rows={layout.rows} maxWidth={layout.maxWidth} />

      {env.rainIntensity > 0 && (
        <Rain intensity={env.rainIntensity} center={[0, 0, layout.lastZ * 0.12]} />
      )}

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
