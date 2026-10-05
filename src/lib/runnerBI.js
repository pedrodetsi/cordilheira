// ─────────────────────────────────────────────────────────────────────────────
// Runner BI: indicadores de desempenho por período, com filtros de distância,
// ritmo e dia da semana. Tudo calculado no cliente a partir das corridas
// enriquecidas (`enrich()` em insights.js).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtKm, fmtPace } from './insights'

const DAY = 864e5
const pad2 = (n) => String(n).padStart(2, '0')
const clampN = (x, a, b) => Math.min(b, Math.max(a, x))

export const PERIODS = [
  ['last', 'Última corrida'], ['7d', '7 dias'], ['30d', '30 dias'], ['90d', '90 dias'],
  ['ytd', 'Este ano'], ['ly', 'Ano passado'], ['all', 'Tudo'], ['custom', 'Escolher datas'],
]
export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export const GOOD = '#3f8a5c'
export const BAD = '#c46a34'
export const NEU = '#857a6c'
const HI = '#c27a1e'
const LO = '#cdbfac'

export const isoD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
const parseD = (s) => new Date(s + 'T00:00')
const sod = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const fmtShort = (d, y) =>
  d.toLocaleDateString('pt-BR', y ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: 'short' })
    .replace(/\./g, '').replace(/ de /g, ' ')
const fmtTot = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60)
  return h ? `${h}h${pad2(m)}` : `${m}min`
}
const fmtHMS = (sec) => {
  sec = Math.round(sec)
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}
const wdIdx = (d) => (d.getDay() + 6) % 7
const monday = (d) => { const x = sod(d); x.setDate(x.getDate() - wdIdx(x)); return x }
const weekNo = (d) => Math.round(monday(d).getTime() / (7 * DAY))
const todOf = (h) => (h >= 5 && h < 11 ? 0 : h >= 11 && h < 14 ? 1 : h >= 14 && h < 18 ? 2 : 3)

function pctDelta(c, p) {
  if (p == null) return { txt: '', c: NEU }
  if (!p) return { txt: c ? 'sem dados antes' : '', c: NEU }
  const v = ((c - p) / p) * 100
  if (Math.abs(v) < 1) return { txt: '= igual', c: NEU }
  return { txt: `${v > 0 ? '▲' : '▼'} ${Math.abs(Math.round(v))}%`, c: v > 0 ? GOOD : BAD }
}
function paceDelta(c, p) {
  if (c == null || p == null) return { txt: '', c: NEU }
  const d = c - p
  if (Math.abs(d) < 2) return { txt: '= igual', c: NEU }
  return {
    txt: `${d < 0 ? '▲' : '▼'} ${fmtPace(Math.abs(d))} ${d < 0 ? 'mais rápido' : 'mais lento'}`,
    c: d < 0 ? GOOD : BAD,
  }
}

// Data de referência = max(última corrida, updatedAt do sync).
export function biRef(runs, updatedAt) {
  const last = sod(runs[runs.length - 1].date)
  const up = updatedAt && /^\d{4}-\d{2}-\d{2}/.test(updatedAt) ? parseD(updatedAt.slice(0, 10)) : last
  return up > last ? up : last
}

// Limites dos filtros (dependem só das corridas).
export function biBounds(runs) {
  const paced = runs.filter((r) => r.km >= 1).map((r) => r.pace)
  return {
    kmLo: 0,
    kmHi: Math.ceil(Math.max(...runs.map((r) => r.km))),
    paceLo: Math.floor(Math.min(...paced) / 15) * 15,
    paceHi: Math.ceil(Math.max(...paced) / 15) * 15,
  }
}

export function biDefaults(runs, updatedAt) {
  const b = biBounds(runs)
  const ref = biRef(runs, updatedAt)
  return {
    period: '30d',
    from: isoD(new Date(ref.getTime() - 29 * DAY)),
    to: isoD(ref),
    kmMin: b.kmLo, kmMax: b.kmHi,
    paceMin: b.paceLo, paceMax: b.paceHi,
    days: [1, 1, 1, 1, 1, 1, 1],
    filtersOpen: false,
  }
}

// Garante que um estado salvo (localStorage) continua válido com dados novos.
export function sanitizeBI(saved, runs, updatedAt) {
  const d = biDefaults(runs, updatedAt)
  if (!saved || typeof saved !== 'object') return d
  const b = biBounds(runs)
  const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? clampN(v, lo, hi) : def)
  const s = {
    ...d,
    period: PERIODS.some(([k]) => k === saved.period) ? saved.period : d.period,
    from: typeof saved.from === 'string' ? saved.from : d.from,
    to: typeof saved.to === 'string' ? saved.to : d.to,
    kmMin: num(saved.kmMin, b.kmLo, b.kmHi, d.kmMin),
    kmMax: num(saved.kmMax, b.kmLo, b.kmHi, d.kmMax),
    paceMin: num(saved.paceMin, b.paceLo, b.paceHi, d.paceMin),
    paceMax: num(saved.paceMax, b.paceLo, b.paceHi, d.paceMax),
    days: Array.isArray(saved.days) && saved.days.length === 7 && saved.days.some(Boolean)
      ? saved.days.map((x) => (x ? 1 : 0)) : d.days,
    filtersOpen: false,
  }
  if (s.kmMin > s.kmMax) [s.kmMin, s.kmMax] = [d.kmMin, d.kmMax]
  if (s.paceMin > s.paceMax) [s.paceMin, s.paceMax] = [d.paceMin, d.paceMax]
  return s
}

function metrics(list, w0, w1) {
  const n = list.length
  const km = list.reduce((s, r) => s + r.km, 0)
  const sec = list.reduce((s, r) => s + r.seconds, 0)
  const elev = list.reduce((s, r) => s + r.elevGain, 0)
  const weeks = w0 && w1 ? Math.max(1, (w1 - w0) / (7 * DAY)) : null
  return { n, km, sec, elev, avgPace: km ? sec / km : null, weekly: weeks ? km / weeks : null }
}

// Calcula tudo o que a tela mostra para o estado `s`.
export function computeBI(runs, updatedAt, s) {
  const bounds = biBounds(runs)
  const pass = (r) =>
    r.km >= s.kmMin && r.km <= s.kmMax &&
    (r.km < 1 || (r.pace >= s.paceMin && r.pace <= s.paceMax)) &&
    s.days[wdIdx(r.date)]
  const F = runs.filter(pass)
  const ref = biRef(runs, updatedAt)
  const refEnd = new Date(ref.getTime() + DAY)
  const y = ref.getFullYear()

  let w0, w1, p0 = null, p1 = null, cmp = '', cur, prev = null
  const inW = (a, z) => F.filter((r) => r.date >= a && r.date < z)
  switch (s.period) {
    case 'last':
      cur = F.slice(-1)
      prev = F.length > 1 ? F.slice(-2, -1) : null
      cmp = 'vs. corrida anterior'
      break
    case '7d': case '30d': case '90d': {
      const n = parseInt(s.period, 10)
      w1 = refEnd; w0 = new Date(refEnd.getTime() - n * DAY)
      p1 = w0; p0 = new Date(w0.getTime() - n * DAY)
      cmp = `vs. ${n} dias anteriores`
      break
    }
    case 'ytd':
      w0 = new Date(y, 0, 1); w1 = refEnd
      p0 = new Date(y - 1, 0, 1); p1 = new Date(y - 1, ref.getMonth(), ref.getDate() + 1)
      cmp = `vs. mesmo período de ${y - 1}`
      break
    case 'ly':
      w0 = new Date(y - 1, 0, 1); w1 = new Date(y, 0, 1)
      p0 = new Date(y - 2, 0, 1); p1 = w0
      cmp = `vs. ${y - 2}`
      break
    case 'all':
      w0 = sod(runs[0].date); w1 = refEnd
      cmp = 'todo o histórico'
      break
    case 'custom':
    default: {
      let f = parseD(s.from), t = new Date(parseD(s.to).getTime() + DAY)
      if (isNaN(f) || isNaN(t) || t <= f) { f = new Date(refEnd.getTime() - 30 * DAY); t = refEnd }
      w0 = f; w1 = t; p1 = f; p0 = new Date(f.getTime() - (t - f))
      cmp = `vs. ${Math.round((t - f) / DAY)} dias anteriores`
    }
  }
  if (!cur) { cur = inW(w0, w1); if (p0) prev = inW(p0, p1) }
  const M = metrics(cur, w0, w1)
  const P = prev ? metrics(prev, p0, p1) : null
  if (s.period === 'last') M.weekly = null

  const rangeLabel = s.period === 'last'
    ? (cur[0] ? `Corrida de ${fmtShort(cur[0].date, true)}` : 'Nenhuma corrida')
    : `${fmtShort(w0, true)} – ${fmtShort(new Date(w1.getTime() - DAY), true)}`

  let active = 0
  if (s.kmMin > bounds.kmLo || s.kmMax < bounds.kmHi) active++
  if (s.paceMin > bounds.paceLo || s.paceMax < bounds.paceHi) active++
  if (s.days.some((d) => !d)) active++

  const base = {
    bounds, rangeLabel, cmpLabel: cmp,
    filterSummary: active ? `${active} ${active > 1 ? 'ativos' : 'ativo'}` : 'Todas as corridas',
    nTxt: `${M.n} ${M.n === 1 ? 'corrida' : 'corridas'}`,
    empty: M.n === 0,
  }
  if (!M.n) return base

  const dK = pctDelta(M.km, P && P.km), dN = pctDelta(M.n, P && P.n)
  const dS = pctDelta(M.sec, P && P.sec), dE = pctDelta(M.elev, P && P.elev)
  const kpis = [
    { label: 'Distância', val: fmtKm(M.km, M.km >= 100 ? 0 : 1), unit: 'km', ...dK },
    { label: 'Corridas', val: String(M.n), unit: '', ...dN },
    { label: 'Tempo correndo', val: fmtTot(M.sec), unit: '', ...dS },
    { label: 'Subida acumulada', val: Math.round(M.elev).toLocaleString('pt-BR'), unit: 'm', ...dE },
  ]

  const pd = paceDelta(M.avgPace, P && P.avgPace)
  const paced = cur.filter((r) => r.km >= 1)
  const best = paced.length ? paced.reduce((a, r) => (r.pace < a.pace ? r : a)) : null
  const longest = cur.reduce((a, r) => (r.km > a.km ? r : a))
  const prs = [[5, '5 km'], [10, '10 km'], [21.0975, 'Meia maratona']].map(([t, label]) => {
    const c = cur.filter((r) => r.km >= t)
    if (!c.length) {
      return { label, time: '—', sub: `nenhuma corrida de ${label === 'Meia maratona' ? '21,1 km' : label} ou mais` }
    }
    const r = c.reduce((a, x) => (x.pace < a.pace ? x : a))
    return { label, time: fmtHMS(r.pace * t), sub: `${fmtShort(r.date, true)} · ${fmtKm(r.km)} km a ${fmtPace(r.pace)}/km` }
  })

  // Evolução do ritmo (pontos = corridas, linha = média móvel de 5)
  let paceChart = null
  if (paced.length >= 3) {
    const ps = paced.map((r) => r.pace)
    const sorted = [...ps].sort((a, z) => a - z)
    const q = (f) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(f * (sorted.length - 1))))]
    let lo = q(0.03), hi = q(0.97)
    if (hi - lo < 20) { lo -= 10; hi += 10 }
    const W = 270, H = 110, pad = 6, n = ps.length
    const X = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W)
    const Y = (p) => pad + clampN((p - lo) / (hi - lo), 0, 1) * (H - 2 * pad)
    const dots = ps.map((p, i) => `M${X(i).toFixed(1)} ${Y(p).toFixed(1)}h0.01`).join('')
    const k = Math.min(5, n)
    const avg = ps.map((_, i) => {
      const a = Math.max(0, i - k + 1), sl = ps.slice(a, i + 1)
      return sl.reduce((x, z) => x + z, 0) / sl.length
    })
    const line = avg.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(p).toFixed(1)}`).join('')
    const half = Math.floor(n / 2)
    const m1 = ps.slice(0, half).reduce((x, z) => x + z, 0) / half
    const m2 = ps.slice(n - half).reduce((x, z) => x + z, 0) / half
    const diff = m2 - m1
    paceChart = {
      dots, line, fast: fmtPace(lo), slow: fmtPace(hi),
      from: fmtShort(paced[0].date, true), to: fmtShort(paced[n - 1].date, true),
      trendTxt: Math.abs(diff) < 3 ? 'estável'
        : `${diff < 0 ? '▲' : '▼'} ${fmtPace(Math.abs(diff))}/km ${diff < 0 ? 'mais rápido' : 'mais lento'}`,
      trendC: Math.abs(diff) < 3 ? NEU : diff < 0 ? GOOD : BAD,
    }
  }

  // Km por semana (segunda → domingo), até as últimas 26
  let weekly = { avg: '—', delta: '', deltaC: NEU, bars: null }
  if (w0 && w1) {
    const m0 = monday(w0)
    const nW = Math.max(1, Math.ceil((w1 - m0) / (7 * DAY)))
    const arr = new Array(nW).fill(0)
    cur.forEach((r) => {
      const i = Math.floor((monday(r.date) - m0) / (7 * DAY) + 0.01)
      if (i >= 0 && i < nW) arr[i] += r.km
    })
    const show = arr.slice(-26)
    const mx = Math.max(...show, 0.001)
    const startIdx = nW - show.length
    const wd = pctDelta(M.weekly, P && P.weekly)
    weekly = {
      avg: fmtKm(M.weekly), delta: wd.txt, deltaC: wd.c,
      bars: show.length >= 2 ? show.map((v) => ({ h: (v / mx) * 100, c: v === mx ? HI : LO })) : null,
      from: fmtShort(new Date(m0.getTime() + startIdx * 7 * DAY)),
      to: fmtShort(new Date(m0.getTime() + (nW - 1) * 7 * DAY)),
      note: arr.length > 26 ? 'últimas 26 semanas' : `${show.length} semanas`,
    }
  }

  // Sequências
  const wl = [...new Set(cur.map((r) => weekNo(r.date)))].sort((a, z) => a - z)
  let maxWeeks = 0, run = 0
  wl.forEach((w, i) => { run = i && w === wl[i - 1] + 1 ? run + 1 : 1; maxWeeks = Math.max(maxWeeks, run) })
  const dl = [...new Set(cur.map((r) => Math.round(sod(r.date).getTime() / DAY)))].sort((a, z) => a - z)
  let maxDays = 0; run = 0
  dl.forEach((d, i) => { run = i && d === dl[i - 1] + 1 ? run + 1 : 1; maxDays = Math.max(maxDays, run) })
  const allW = new Set(F.map((r) => weekNo(r.date)))
  let cw = weekNo(ref)
  if (!allW.has(cw)) cw--
  let curWeeks = 0
  while (allW.has(cw)) { curWeeks++; cw-- }

  // Quando você corre
  const wdC = new Array(7).fill(0)
  cur.forEach((r) => wdC[wdIdx(r.date)]++)
  const wdMax = Math.max(...wdC, 1)
  const todC = [0, 0, 0, 0]
  cur.forEach((r) => todC[todOf(r.hour)]++)
  const todMax = Math.max(...todC, 1)

  return {
    ...base, kpis,
    avgPace: fmtPace(M.avgPace), paceDelta: pd.txt, paceDeltaC: pd.c,
    bestPace: best ? fmtPace(best.pace) : '—',
    bestPaceSub: best ? `${fmtShort(best.date, true)} · ${fmtKm(best.km)} km` : '',
    longest: fmtKm(longest.km, 2),
    longestSub: `${fmtShort(longest.date, true)} · ${fmtPace(longest.pace)}/km`,
    prs, paceChart, weekly,
    curWeeks, maxWeeks, maxDays,
    wd: WEEKDAYS.map((l, i) => ({
      label: l, n: wdC[i], h: (wdC[i] / wdMax) * 100, c: wdC[i] === wdMax && wdC[i] ? HI : LO,
    })),
    tod: ['Manhã', 'Almoço', 'Tarde', 'Noite'].map((l, i) => ({
      label: l, w: (todC[i] / todMax) * 100, pct: `${Math.round((todC[i] / M.n) * 100)}%`,
      c: todC[i] === todMax ? HI : LO,
    })),
  }
}
