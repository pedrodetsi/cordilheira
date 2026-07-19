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

export function makePeakGeometry({ seed, radius, height, baseColor, tipColor, snowline = 0.62 }) {
  let g = new THREE.ConeGeometry(radius, 1, 7, 4)
  g.translate(0, 0.5, 0)

  const rnd = mulberry32(seed)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i)
    if (y > 0.01 && y < 0.99) {
      const spread = radius * 0.34 * (1 - y * 0.75)
      p.setX(i, p.getX(i) + (rnd() - 0.5) * spread)
      p.setZ(i, p.getZ(i) + (rnd() - 0.5) * spread)
      p.setY(i, y + (rnd() - 0.5) * 0.07)
    }
  }

  g = g.toNonIndexed()
  g.computeVertexNormals()

  const base = new THREE.Color(baseColor)
  const tip = new THREE.Color(tipColor)
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    // altura no mundo deste vértice, normalizada pela "linha de neve" global
    const worldY = pos.getY(i) * height
    const t = THREE.MathUtils.smoothstep(worldY / (snowline * height + 0.6), 0.25, 1)
    c.copy(base).lerp(tip, t)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}
