import * as THREE from 'three'

// Gera um pico facetado (cone irregular) com cores por vértice:
// base azul-ardósia → topo neve. Altura 1 (escalada depois via mesh.scale.y).
// A irregularidade é determinística por corrida (seed), então o terreno é
// estável entre renders.

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const ROCK = new THREE.Color('#8a7f70') // rocha exposta (base de corrida montanhosa)

// `ruggedness` (0..1) = quão montanhosa foi a corrida (ganho de elevação por km).
// Modula, de forma SUTIL: nº de facetas + amplitude do recorte da silhueta +
// rocha exposta na base (só em picos não-recorde, via `rock`).
export function makePeakGeometry({
  seed, radius, height, baseColor, tipColor, snowline = 0.62,
  ruggedness = 0, rock = true,
}) {
  const rug = THREE.MathUtils.clamp(ruggedness, 0, 1)
  const segments = 7 + Math.round(rug * 3) // 7 (plano) → 10 (montanhoso)
  let g = new THREE.ConeGeometry(radius, 1, segments, 4)
  g.translate(0, 0.5, 0)

  const rnd = mulberry32(seed)
  const spreadK = 0.32 + rug * 0.30 // recorte lateral: sutilmente maior se montanhoso
  const wobbleK = 0.06 + rug * 0.10 // cristas verticais
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    if (y > 0.01 && y < 0.99) {
      const spread = radius * spreadK * (1 - y * 0.75)
      p.setX(i, p.getX(i) + (rnd() - 0.5) * spread)
      p.setZ(i, p.getZ(i) + (rnd() - 0.5) * spread)
      p.setY(i, y + (rnd() - 0.5) * wobbleK)
    }
  }

  g = g.toNonIndexed()
  g.computeVertexNormals()

  const base = new THREE.Color(baseColor)
  const tip = new THREE.Color(tipColor)
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const low = new THREE.Color(), c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const h01 = pos.getY(i) // 0 na base → ~1 no topo
    const worldY = h01 * height
    // rocha só na porção inferior, proporcional à montanhosidade
    const rockMask = rock ? THREE.MathUtils.clamp(1 - h01 / 0.5, 0, 1) : 0
    low.copy(base).lerp(ROCK, rug * 0.5 * rockMask)
    const t = THREE.MathUtils.smoothstep(worldY / (snowline * height + 0.6), 0.25, 1)
    c.copy(low).lerp(tip, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}
