import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Pico "montanha realista": cone facetado não-indexado com jitter determinístico
// por hash e cor por face — base → meio pela altura relativa, neve acima do
// limiar absoluto (só em picos altos), com ruído leve. Corridas montanhosas
// (≥15 m/km) ganham raio ×1.08 e jitter ×1.9. Geometria já na altura final
// (a animação de entrada escala y de 0 a 1).
// ─────────────────────────────────────────────────────────────────────────────

const clamp = (x, a, b) => Math.min(b, Math.max(a, x))
export const hash3 = (a, b, c) => {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453
  return s - Math.floor(s)
}

// V: { radius, seg, hseg, jitter, snowAbs?, snowFrom? }
// palette: { base, mid, snow }
export function makePeakGeometry(V, h, rugged, seed, palette) {
  let g = new THREE.ConeGeometry(V.radius * (rugged ? 1.08 : 1), h, V.seg, V.hseg, false)
  g.translate(0, h / 2, 0)
  g = g.toNonIndexed()
  const p = g.attributes.position
  const jit = V.jitter * (rugged ? 1.9 : 1)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    if (y < 0.001 || y > h * 0.999) continue
    // chave pela posição original → vértices compartilhados recebem o mesmo jitter
    const kx = Math.round(x * 1000), ky = Math.round(y * 1000), kz = Math.round(z * 1000)
    const f = 1 + (hash3(kx + seed, ky, kz) - 0.5) * 2 * jit
    p.setXYZ(i, x * f, y + (hash3(kx, ky + seed, kz) - 0.5) * jit * h * 0.22, z * f)
  }

  const col = new Float32Array(p.count * 3)
  const c = new THREE.Color()
  const base = new THREE.Color(palette.base)
  const mid = new THREE.Color(palette.mid)
  const snow = new THREE.Color(palette.snow)
  const snowT = V.snowAbs != null ? Math.max(V.snowAbs, h * 0.5) / h : V.snowFrom
  for (let t = 0; t < p.count; t += 3) {
    const cy = (p.getY(t) + p.getY(t + 1) + p.getY(t + 2)) / 3 / h
    const n = (hash3(t, seed, 3) - 0.5) * 0.12
    if (cy + n > snowT && (V.snowAbs == null || h > V.snowAbs * 0.9)) c.copy(snow)
    else c.copy(base).lerp(mid, clamp((cy + n) / snowT, 0, 1))
    for (let k = 0; k < 3; k++) c.toArray(col, (t + k) * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}
