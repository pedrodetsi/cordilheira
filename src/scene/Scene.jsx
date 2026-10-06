import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import Peak from './Peak'
import Sky from './Sky'
import Rain from './Rain'
import Terrain from './Terrain'
import RecordBurst from './RecordBurst'
import TapPicker from './TapPicker'
import { TrendRibbon, GoalPeak, RecordHalo, SelectRing, YearMarkers } from './extras'
import { H_SCALE } from '../lib/layout'

const easeOut = (x) => 1 - Math.pow(1 - x, 3)

// Exposição do tone mapping por tema (a noite é mais "aberta").
function Exposure({ value }) {
  const { gl } = useThree()
  useEffect(() => { gl.toneMappingExposure = value }, [gl, value])
  return null
}

// Câmera: voo de abertura (intro), voo curto ao entrar no mapa e transição
// suave intro → mapa. Qualquer gesto do usuário interrompe o voo.
function CameraRig({ mode, lastZ }) {
  const { camera, controls } = useThree()
  const flight = useRef(null)
  const took = useRef(false)

  const poses = useMemo(() => ({
    introFrom: { p: new THREE.Vector3(-4, 60, lastZ + 120), t: new THREE.Vector3(0, 0, lastZ * 0.2) },
    intro: { p: new THREE.Vector3(9, 7.5, lastZ + 19), t: new THREE.Vector3(0, 5, lastZ - 26) },
    mapFrom: { p: new THREE.Vector3(18, 44, lastZ + 62), t: new THREE.Vector3(0, -1, lastZ * 0.18) },
    map: { p: new THREE.Vector3(13, 27, lastZ + 42), t: new THREE.Vector3(0, -1, lastZ * 0.18) },
  }), [lastZ])

  useEffect(() => {
    if (!controls) return
    const first = flight.current == null
    let from
    if (first) {
      from = mode === 'intro' ? poses.introFrom : poses.mapFrom
      camera.position.copy(from.p)
      controls.target.copy(from.t)
    } else {
      from = { p: camera.position.clone(), t: controls.target.clone() }
    }
    const to = mode === 'intro' ? poses.intro : poses.map
    const dur = mode === 'intro' ? 5.5 : first ? 2.6 : 1.8
    flight.current = { from, to, dur, start: null }
    took.current = false
    const stop = () => { took.current = true }
    controls.addEventListener('start', stop)
    return () => controls.removeEventListener('start', stop)
  }, [mode, controls, camera, poses])

  useFrame((state) => {
    const f = flight.current
    if (!f || took.current || !controls) return
    if (f.start == null) f.start = state.clock.elapsedTime
    const k = easeOut(Math.min(1, (state.clock.elapsedTime - f.start) / f.dur))
    camera.position.lerpVectors(f.from.p, f.to.p, k)
    controls.target.lerpVectors(f.from.t, f.to.t, k)
    if (k >= 1) took.current = true
  })
  return null
}

export default function Scene({
  runs, layout, matchedIds, selected, onSelect,
  monthly, goal, record, env, mode, lowPower,
}) {
  const P = env.palette
  const shadows = !lowPower
  const intro0 = useRef(mode === 'intro').current
  const D0 = intro0 ? 0.1 : 0.25
  const DSTEP = intro0 ? 0.006 : 0.009
  const recordPos = layout.pos.get(record.id)
  const recordH = Math.max(0.35, record.km * H_SCALE)
  const recordAt = D0 + record.i * DSTEP + 0.9
  const narrow = typeof window !== 'undefined' && window.innerWidth < 700
  const sunPos = env.sun.dir.map((v) => v * 120)
  const selPos = selected && layout.pos.get(selected.id)

  return (
    <Canvas
      dpr={lowPower ? [1, 1.5] : [1, 2]}
      shadows={shadows ? 'soft' : false}
      camera={{ position: [18, 44, layout.lastZ + 62], fov: narrow ? 48 : 42, near: 0.5, far: 1200 }}
      gl={{ antialias: true }}
    >
      <Exposure value={env.exposure} />
      <fog attach="fog" args={[env.fog.color, env.fog.near, env.fog.far]} />
      <hemisphereLight args={[env.hemi.sky, env.hemi.ground, env.hemi.intensity]} />
      <directionalLight
        position={sunPos}
        color={env.sun.color}
        intensity={env.sun.intensity}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={90}
        shadow-camera-bottom={-90}
        shadow-camera-near={1}
        shadow-camera-far={320}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Sky env={env} />
      <Terrain layout={layout} palette={P} lowPower={lowPower} shadows={shadows} />

      {runs.map((r, i) => {
        const p = layout.pos.get(r.id)
        return (
          <Peak
            key={r.id}
            run={r}
            x={p.x}
            z={p.z}
            isRecord={r.id === record.id}
            matched={matchedIds.has(r.id)}
            palette={P}
            shadows={shadows}
            delay={D0 + i * DSTEP}
          />
        )
      })}

      <RecordHalo x={recordPos.x} z={recordPos.z} height={recordH} palette={P} showAt={recordAt} />
      <RecordBurst position={[recordPos.x, 0, recordPos.z]} height={recordH} startAt={recordAt + 0.35} />
      {selPos && selected.id !== record.id && (
        <SelectRing x={selPos.x} z={selPos.z} height={selected.km * H_SCALE} color={P.select} />
      )}
      <TrendRibbon monthly={monthly} rows={layout.rows} maxWidth={layout.maxWidth} palette={P} />
      <GoalPeak goal={goal} lastZ={layout.lastZ} palette={P} />
      <YearMarkers rows={layout.rows} maxWidth={layout.maxWidth} color={P.label} />

      {env.rainIntensity > 0 && (
        <Rain intensity={env.rainIntensity} center={[0, 0, layout.lastZ * 0.12]} />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        minDistance={8}
        maxDistance={190}
        maxPolarAngle={1.47}
      />
      <CameraRig mode={mode} lastZ={layout.lastZ} />
      <TapPicker onSelect={onSelect} />
    </Canvas>
  )
}
