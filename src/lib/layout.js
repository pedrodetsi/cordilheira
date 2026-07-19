// Layout da cordilheira: cada mês é uma fileira (eixo Z, do passado para o
// futuro), cada corrida do mês é um pico na fileira (eixo X, centralizado).

export const PEAK_SPACING = 1.9
export const ROW_SPACING = 2.7
export const H_SCALE = 0.42 // 1 km = 0.42 unidades de altura

export function buildLayout(runs) {
  const first = runs[0].monthKey
  const last = runs[runs.length - 1].monthKey
  const months = []
  let [y, m] = first.split('-').map(Number)
  const [ly, lm] = last.split('-').map(Number)
  while (y < ly || (y === ly && m <= lm)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }

  const byMonth = new Map(months.map((k) => [k, []]))
  for (const r of runs) byMonth.get(r.monthKey).push(r)

  const depth = (months.length - 1) * ROW_SPACING
  const zOff = -depth / 2

  const pos = new Map()
  let maxWidth = 0
  const rows = months.map((key, rowIdx) => {
    const rs = byMonth.get(key)
    const z = zOff + rowIdx * ROW_SPACING
    const width = (rs.length - 1) * PEAK_SPACING
    maxWidth = Math.max(maxWidth, width)
    rs.forEach((r, i) => {
      pos.set(r.id, { x: i * PEAK_SPACING - width / 2, z })
    })
    return { key, z, count: rs.length, year: Number(key.slice(0, 4)), month: Number(key.slice(5)) }
  })

  return { rows, pos, depth, zOff, maxWidth, lastZ: zOff + depth }
}
