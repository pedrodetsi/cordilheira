// Estatísticas, recordes históricos, detecção de platôs, tendência e meta.

export function enrich(raw) {
  const sorted = [...raw].sort((a, b) => a.start.localeCompare(b.start))
  let best = 0
  return sorted.map((a, i) => {
    const km = a.d / 1000
    const pace = a.t / km // seg por km
    const wasPR = km > best
    if (wasPR) best = km
    const date = new Date(a.start)
    return {
      id: a.start,
      i,
      km,
      meters: a.d,
      seconds: a.t,
      pace,
      wasPR,
      date,
      monthKey: a.start.slice(0, 7),
      year: date.getFullYear(),
      hour: date.getHours(),
    }
  })
}

export function periodOfDay(hour) {
  if (hour >= 5 && hour < 11) return 'manha'
  if (hour >= 11 && hour < 14) return 'almoco'
  if (hour >= 14 && hour < 18) return 'tarde'
  return 'noite'
}

export function computeStats(runs) {
  const totalKm = runs.reduce((s, r) => s + r.km, 0)
  const record = runs.reduce((a, b) => (b.km > a.km ? b : a), runs[0])
  const n = Math.min(10, Math.floor(runs.length / 2))
  const firstAvg = mean(runs.slice(0, n).map((r) => r.km))
  const lastAvg = mean(runs.slice(-n).map((r) => r.km))
  return { totalKm, record, firstAvg, lastAvg, n, count: runs.length }
}

// Platôs: janelas de 8 corridas em que ≥75% ficam a ±12% da mediana da janela.
// Janelas "planas" sobrepostas são fundidas em segmentos.
export function detectPlateaus(runs, win = 8, tol = 0.12, frac = 0.75) {
  const flat = []
  for (let s = 0; s + win <= runs.length; s++) {
    const kms = runs.slice(s, s + win).map((r) => r.km)
    const med = median(kms)
    const inBand = kms.filter((k) => Math.abs(k - med) / med <= tol).length
    if (inBand / win >= frac) flat.push({ start: s, end: s + win - 1, med })
  }
  let segs = []
  for (const w of flat) {
    const last = segs[segs.length - 1]
    if (last && w.start <= last.end + 1) {
      last.end = Math.max(last.end, w.end)
      last.meds.push(w.med)
    } else segs.push({ start: w.start, end: w.end, meds: [w.med] })
  }
  // funde segmentos vizinhos com mediana parecida (mesmo platô interrompido
  // por poucas corridas fora da banda) e descarta os curtos demais
  const merged = []
  for (const s of segs) {
    const last = merged[merged.length - 1]
    const medA = last && median(last.meds)
    const medB = median(s.meds)
    if (last && s.start - last.end <= 3 && Math.abs(medB - medA) / medA < 0.08) {
      last.end = s.end
      last.meds.push(...s.meds)
    } else merged.push(s)
  }
  segs = merged.filter((s) => s.end - s.start + 1 >= 10)
  return segs.map((s) => {
    const members = runs.slice(s.start, s.end + 1)
    const med = median(members.map((r) => r.km))
    const inIds = new Set(
      members.filter((r) => Math.abs(r.km - med) / med <= tol).map((r) => r.id)
    )
    return { start: s.start, end: s.end, medKm: med, count: s.end - s.start + 1, inIds }
  })
}

// Média por mês (para a trilha de tendência).
export function monthlyAverages(runs) {
  const byMonth = new Map()
  for (const r of runs) {
    if (!byMonth.has(r.monthKey)) byMonth.set(r.monthKey, [])
    byMonth.get(r.monthKey).push(r.km)
  }
  return [...byMonth.entries()].map(([monthKey, kms]) => ({ monthKey, avg: mean(kms) }))
}

// Tendência: média das últimas 8 semanas vs. as 8 semanas anteriores.
export function computeTrend(runs) {
  const last = runs[runs.length - 1].date.getTime()
  const wk8 = 56 * 24 * 3600 * 1000
  const recent = runs.filter((r) => last - r.date.getTime() < wk8)
  const before = runs.filter((r) => {
    const dt = last - r.date.getTime()
    return dt >= wk8 && dt < 2 * wk8
  })
  if (!recent.length || !before.length) return { dir: 'flat', delta: 0 }
  const a = mean(recent.map((r) => r.km))
  const b = mean(before.map((r) => r.km))
  const delta = (a - b) / b
  return { dir: delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'flat', delta, recentAvg: a, beforeAvg: b }
}

// Próxima meta: +10% sobre a corrida mais longa dos últimos 60 dias
// (progressão gradual e segura), arredondada para 0,5 km.
export function computeGoal(runs) {
  const last = runs[runs.length - 1].date.getTime()
  const d60 = 60 * 24 * 3600 * 1000
  const recent = runs.filter((r) => last - r.date.getTime() < d60)
  const base = recent.length
    ? Math.max(...recent.map((r) => r.km))
    : Math.max(...runs.map((r) => r.km))
  return { baseKm: base, goalKm: Math.round((base * 1.1) * 2) / 2 }
}

export function matchesFilters(run, f) {
  if (f.paceMin != null && run.pace < f.paceMin) return false
  if (f.paceMax != null && run.pace > f.paceMax) return false
  if (f.kmMin != null && run.km < f.kmMin) return false
  if (f.kmMax != null && run.km > f.kmMax) return false
  if (f.periods.length && !f.periods.includes(periodOfDay(run.hour))) return false
  if (f.years.length && !f.years.includes(run.year)) return false
  return true
}

export const fmtKm = (km, digits = 1) =>
  km.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const fmtPace = (secPerKm) => {
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export const fmtDur = (sec) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.round(sec % 60)
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min${String(s).padStart(2, '0')}`
}

export const fmtDate = (d) =>
  d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

// "5:30" → 330 (segundos por km); vazio/inválido → null
export function parsePace(txt) {
  if (!txt) return null
  const m = txt.trim().match(/^(\d{1,2})[:'](\d{1,2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
function median(xs) {
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
