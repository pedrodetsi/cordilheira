import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Terreno: solo ondulado de neve (dunas suaves) numa paisagem AMPLA, com uma
// cordilheira distante no horizonte para dar vastidão. A área central onde
// ficam os picos-corrida permanece quase plana (máscara), para que eles não
// flutuem nem afundem; as dunas crescem só para fora, no entorno e no primeiro
// plano. Cor e sombreamento seguem o ambiente (dia/noite × clima).
// ─────────────────────────────────────────────────────────────────────────────

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
function hash(x, z) {
  const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return h - Math.floor(h)
}
function vnoise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z)
  const xf = x - xi, zf = z - zi
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf)
  const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x, z) {
  return vnoise(x, z) * 0.6 + vnoise(x * 2.3, z * 2.3) * 0.3 + vnoise(x * 4.9, z * 4.9) * 0.1
}

function buildTerrain({ size, seg, midZ, xHalf, zHalf }) {
  const MARGIN = 5, RAMP = 20, MAXAMP = 2.5, FREQ = 0.05
  const half = size / 2
  const step = size / seg
  const n = seg + 1
  const pos = new Float32Array(n * n * 3)
  const col = new Float32Array(n * n * 3)
  const dip = new THREE.Color('#cdd9e6'), crest = new THREE.Color('#ffffff'), c = new THREE.Color()

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -half + ix * step
      const z = -half + iz * step
      const dx = Math.max(0, Math.abs(x) - (xHalf + MARGIN))
      const dz = Math.max(0, Math.abs(z - midZ) - (zHalf + MARGIN))
      const distOut = Math.sqrt(dx * dx + dz * dz)
      const amp = smoothstep(0, RAMP, distOut) * MAXAMP
      const y = (fbm((x + 500) * FREQ, (z + 500) * FREQ) - 0.5) * 2 * amp
      const o = (iz * n + ix) * 3
      pos[o] = x; pos[o + 1] = y; pos[o + 2] = z
      const hN = THREE.MathUtils.clamp((y + MAXAMP) / (2 * MAXAMP), 0, 1)
      c.copy(dip).lerp(crest, 0.55 + hN * 0.45)
      col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b
    }
  }

  const idx = []
  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * n + ix, b = a + 1, cc = a + n, d = cc + 1
      idx.push(a, cc, b, b, cc, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function Snowfield({ env, layout }) {
  const ref = useRef()
  const geometry = useMemo(
    () =>
      buildTerrain({
        size: 760,
        seg: 200,
        midZ: layout.zOff + layout.depth / 2,
        xHalf: layout.maxWidth / 2,
        zHalf: layout.depth / 2,
      }),
    [layout]
  )
  useFrame(() => {
    if (ref.current) ref.current.material.color.lerp(_g.set(env.ground), 0.05)
  })
  return (
    <mesh ref={ref} geometry={geometry} position-y={-0.02} receiveShadow>
      <meshStandardMaterial vertexColors color={env.ground} roughness={1} flatShading />
    </mesh>
  )
}
const _g = new THREE.Color()

// Cordilheira distante: anel de montanhas low-poly no horizonte, esmaecidas
// pela névoa — dá a sensação de um mundo alpino vasto ao redor.
function DistantRanges({ env }) {
  const cones = useMemo(() => {
    const out = []
    const N = 44
    for (let i = 0; i < N; i++) {
      const ang = i * 2.399963 + hash(i, 7) * 0.5
      const rad = 118 + hash(i, 3) * 74
      const h = 9 + hash(i, 11) * 20
      const baseR = 13 + hash(i, 5) * 22
      out.push({
        x: Math.cos(ang) * rad,
        z: Math.sin(ang) * rad,
        h,
        baseR,
        rot: hash(i, 9) * Math.PI,
      })
    }
    return out
  }, [])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: '#9fb2c6' }),
    []
  )
  useFrame(() => {
    // mescla com o tom do horizonte para derreter na névoa (dia/noite × clima)
    _d.set(env.hemi.ground).lerp(_d2.set(env.fog.color), 0.55)
    mat.color.lerp(_d, 0.05)
  })
  return (
    <group>
      {cones.map((c, i) => (
        <mesh key={i} position={[c.x, c.h / 2 - 1.5, c.z]} rotation-y={c.rot} material={mat}>
          <coneGeometry args={[c.baseR, c.h, 6, 1]} />
        </mesh>
      ))}
    </group>
  )
}
const _d = new THREE.Color(), _d2 = new THREE.Color()

export default function Terrain({ env, layout }) {
  return (
    <>
      <Snowfield env={env} layout={layout} />
      <DistantRanges env={env} />
    </>
  )
}
