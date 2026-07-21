import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

// Textura radial reutilizável (sol, lua, nuvens) via canvas.
function radialTexture(stops) {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [off, col] of stops) g.addColorStop(off, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// Cúpula de céu com gradiente amanhecer→zênite, uniforms lerpados suavemente.
function Dome({ env }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(env.sky.top) },
          mid: { value: new THREE.Color(env.sky.mid) },
          low: { value: new THREE.Color(env.sky.low) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: `
          varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
          void main(){
            float h = normalize(vP).y;
            vec3 c = mix(low, mid, smoothstep(-0.05, 0.2, h));
            c = mix(c, top, smoothstep(0.2, 0.78, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    []
  )
  useFrame(() => {
    mat.uniforms.top.value.lerp(_c.set(env.sky.top), 0.05)
    mat.uniforms.mid.value.lerp(_c2.set(env.sky.mid), 0.05)
    mat.uniforms.low.value.lerp(_c3.set(env.sky.low), 0.05)
  })
  return (
    <mesh material={mat} scale={400} renderOrder={-10}>
      <sphereGeometry args={[1, 32, 24]} />
    </mesh>
  )
}
const _c = new THREE.Color(), _c2 = new THREE.Color(), _c3 = new THREE.Color()

function Sun({ env }) {
  const tex = useMemo(
    () => radialTexture([[0, 'rgba(255,246,224,1)'], [0.25, 'rgba(255,224,150,0.9)'], [0.55, 'rgba(255,205,110,0.35)'], [1, 'rgba(255,200,120,0)']]),
    []
  )
  const ref = useRef()
  const target = useRef(0)
  useFrame(() => {
    if (!ref.current) return
    target.current += ((env.sun.show ? 1 : 0) - target.current) * 0.06
    ref.current.material.opacity = target.current
    ref.current.position.lerp(_v.set(...env.sun.position), 0.05)
    const s = 16 + Math.sin(performance.now() / 1400) * 0.6
    ref.current.scale.set(s, s, 1)
    ref.current.visible = target.current > 0.01
  })
  return (
    <sprite ref={ref} position={env.sun.position} renderOrder={-8}>
      <spriteMaterial map={tex} transparent depthWrite={false} opacity={0} />
    </sprite>
  )
}
const _v = new THREE.Vector3()

function Moon({ env }) {
  const glow = useMemo(
    () => radialTexture([[0, 'rgba(238,244,255,1)'], [0.35, 'rgba(214,228,247,0.55)'], [1, 'rgba(200,214,235,0)']]),
    []
  )
  const ref = useRef()
  const target = useRef(0)
  useFrame(() => {
    if (!ref.current) return
    target.current += ((env.moon.show ? env.moon.opacity : 0) - target.current) * 0.05
    ref.current.visible = target.current > 0.01
    ref.current.children.forEach((ch) => {
      if (ch.material) ch.material.opacity = target.current * (ch.userData.base ?? 1)
    })
  })
  return (
    <group ref={ref} position={env.moon.position} renderOrder={-8}>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} opacity={0} />
      </sprite>
      <mesh userData={{ base: 1 }}>
        <circleGeometry args={[3.1, 40]} />
        <meshBasicMaterial color="#eef4ff" transparent depthWrite={false} opacity={0} />
      </mesh>
    </group>
  )
}

// Nuvens: sprites macios à deriva, opacidade conforme o clima.
function Clouds({ env }) {
  const tex = useMemo(
    () => radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.5, 'rgba(246,249,252,0.55)'], [1, 'rgba(240,245,250,0)']]),
    []
  )
  const puffs = useMemo(() => {
    const rnd = mulberry(9182)
    return Array.from({ length: 9 }, () => ({
      x: (rnd() - 0.5) * 200,
      y: 42 + rnd() * 34,
      z: -60 - rnd() * 90,
      s: 34 + rnd() * 34,
      speed: 0.15 + rnd() * 0.2,
    }))
  }, [])
  const grp = useRef()
  const op = useRef(0)
  useFrame((_, dt) => {
    op.current += (env.cloudOpacity - op.current) * 0.04
    if (!grp.current) return
    grp.current.visible = op.current > 0.02
    grp.current.children.forEach((sp, i) => {
      sp.position.x += puffs[i].speed * dt * 2
      if (sp.position.x > 130) sp.position.x = -130
      // nuvem de chuva puxa para o cinza-azulado
      const grey = env.weather === 'rain' ? 0.85 : env.weather === 'cloudy' ? 0.35 : 0
      sp.material.color.lerp(_cg.set('#b9c3cc'), grey * 0.1 + 0.02)
      sp.material.opacity = op.current
    })
  })
  return (
    <group ref={grp} renderOrder={-7}>
      {puffs.map((p, i) => (
        <sprite key={i} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.62, 1]}>
          <spriteMaterial map={tex} transparent depthWrite={false} opacity={0} color="#ffffff" />
        </sprite>
      ))}
    </group>
  )
}
const _cg = new THREE.Color()

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
  const starGrp = useRef()
  const starOp = useRef(0)
  useFrame(() => {
    starOp.current += (env.stars - starOp.current) * 0.05
    if (starGrp.current) starGrp.current.visible = starOp.current > 0.03
  })
  return (
    <group>
      <Dome env={env} />
      <Sun env={env} />
      <Moon env={env} />
      <Clouds env={env} />
      <group ref={starGrp}>
        <Stars radius={160} depth={60} count={1400} factor={3.2} saturation={0} fade speed={0.6} />
      </group>
    </group>
  )
}
