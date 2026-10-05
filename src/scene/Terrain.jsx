import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Terreno realista, 100% procedural: colinas fbm baixas + cristas "ridged
// multifractal" que só crescem FORA da área dos picos-corrida (rampa
// smoothstep de 40 un.). Cor por vértice: terra → rocha pela inclinação, neve
// por altitude só onde a encosta é plana, manchas de neve no solo e variação
// fina. Material com textura de granulado gerada em canvas (map + bumpMap).
// A geometria (alturas, inclinação, ruídos) é calculada uma vez; trocar o
// tema só recolore os vértices.
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const h2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s) }
function vn(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz)
  const a = h2(i, j), b = h2(i + 1, j), c = h2(i, j + 1), d = h2(i + 1, j + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}
function fbm(x, z, o = 5) {
  let s = 0, a = 0.5, f = 1, n = 0
  for (let k = 0; k < o; k++) { s += a * vn(x * f + k * 17.3, z * f - k * 9.1); n += a; a *= 0.5; f *= 2.03 }
  return s / n
}
function ridged(x, z, o = 5) {
  let s = 0, a = 0.5, f = 1, w = 1, n = 0
  for (let k = 0; k < o; k++) {
    let r = 1 - Math.abs(vn(x * f + k * 31.7, z * f + k * 7.9) * 2 - 1)
    r *= r * w
    w = clamp(r * 1.6, 0, 1)
    s += r * a; n += a; a *= 0.5; f *= 2.1
  }
  return s / n
}

function buildShape(layout, lowPower) {
  const span = layout.maxWidth / 2 + 5
  const zMin = layout.zOff - 4
  const zMax = layout.lastZ + 8
  const outside = (x, z) => {
    const dx = Math.max(0, Math.abs(x) - span)
    const dz = Math.max(0, zMin - z, z - zMax)
    const o = clamp(Math.hypot(dx, dz) / 40, 0, 1)
    return o * o * (3 - 2 * o)
  }
  const hgt = (x, z) => {
    const o = outside(x, z)
    const m = ridged(x * 0.022, z * 0.022, 6)
    const hills = fbm(x * 0.05, z * 0.05, 4)
    const far = clamp((Math.hypot(x, z) - 60) / 90, 0, 1)
    return (hills - 0.5) * 0.5 + o * (m * m * (30 + far * 22) + hills * 6) - 0.05
  }

  const g = lowPower
    ? new THREE.PlaneGeometry(340, 400, 120, 140)
    : new THREE.PlaneGeometry(340, 400, 210, 250)
  g.rotateX(-Math.PI / 2)
  const p = g.attributes.position
  const n = p.count
  const Y = new Float32Array(n), slope = new Float32Array(n)
  const det = new Float32Array(n), fine = new Float32Array(n), patch = new Float32Array(n)
  const e = 0.9
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), z = p.getZ(i), y = hgt(x, z)
    p.setY(i, y)
    Y[i] = y
    const nx = hgt(x - e, z) - hgt(x + e, z)
    const nz = hgt(x, z - e) - hgt(x, z + e)
    slope[i] = 1 - (2 * e) / Math.hypot(nx, 2 * e, nz)
    det[i] = fbm(x * 0.35, z * 0.35, 3)
    fine[i] = vn(x * 1.7, z * 1.7)
    patch[i] = fbm(x * 0.09 + 5, z * 0.09 - 3, 4) + (fine[i] - 0.5) * 0.18
  }
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
  g.computeVertexNormals()
  return { geometry: g, Y, slope, det, fine, patch }
}

function paint(shape, P) {
  const { geometry, Y, slope, det, fine, patch } = shape
  const col = geometry.attributes.color
  const dirt = new THREE.Color(P.groundLo), soil = new THREE.Color(P.groundHi)
  const rock = new THREE.Color(P.base), rockHi = new THREE.Color(P.mid)
  const snowC = new THREE.Color(P.snow), snowG = new THREE.Color(P.groundSnowC || P.snow)
  const tc = new THREE.Color(), rc = new THREE.Color()
  const snowLine = P.snowLine ?? 13
  for (let i = 0; i < Y.length; i++) {
    const y = Y[i], s = slope[i], d = det[i], f = fine[i]
    tc.copy(dirt).lerp(soil, clamp(d * 1.2 - 0.1 + y * 0.02, 0, 1))
    rc.copy(rock).lerp(rockHi, clamp(d * 0.9 + f * 0.25 + y * 0.012, 0, 1))
    tc.lerp(rc, smooth(0.12, 0.38, s + (f - 0.5) * 0.12))
    const flatness = 1 - smooth(0.22, 0.5, s)
    let sn = smooth(snowLine - 4, snowLine + 3, y + (d - 0.5) * 9) * flatness
    if (P.groundSnow != null) {
      sn = Math.max(sn, smooth(P.groundSnow, P.groundSnow + 0.09, patch[i]) * flatness * 0.92)
    }
    tc.lerp(y > snowLine - 4 ? snowC : snowG, clamp(sn, 0, 1))
    tc.multiplyScalar(0.92 + f * 0.16)
    col.setXYZ(i, tc.r, tc.g, tc.b)
  }
  col.needsUpdate = true
}

// Textura de granulado 256×256 (fbm + ruído), usada como map e bumpMap.
function grainTexture() {
  const N = 256
  const c = document.createElement('canvas')
  c.width = c.height = N
  const g = c.getContext('2d')
  const img = g.createImageData(N, N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const v = 0.55 * fbm(x / 9, y / 9, 3) + 0.45 * Math.random()
      const k = Math.round(205 + v * 50)
      const o = (y * N + x) * 4
      img.data[o] = img.data[o + 1] = img.data[o + 2] = k
      img.data[o + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(70, 80)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export default function Terrain({ layout, palette, lowPower, shadows }) {
  const shape = useMemo(() => buildShape(layout, lowPower), [layout, lowPower])
  useEffect(() => () => shape.geometry.dispose(), [shape])
  useMemo(() => paint(shape, palette), [shape, palette])
  const grain = useMemo(() => grainTexture(), [])
  useEffect(() => () => grain.dispose(), [grain])

  return (
    <mesh geometry={shape.geometry} receiveShadow={shadows}>
      <meshStandardMaterial vertexColors roughness={0.95} map={grain} bumpMap={grain} bumpScale={0.6} />
    </mesh>
  )
}
