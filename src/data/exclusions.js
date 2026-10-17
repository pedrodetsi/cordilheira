// ─────────────────────────────────────────────────────────────────────────────
// Corridas que não entram no Cordilheira. Os dados continuam em
// activities.json/activities.js (a sincronização com o Strava não muda); a
// regra é aplicada ao carregar, então também vale para corridas futuras.
//
// 2026, ritmo acima de 6:30/km: corridas acompanhando a namorada no ritmo
// dela, que não refletem o desempenho real.
// ─────────────────────────────────────────────────────────────────────────────

const SLOW_2026 = 6 * 60 + 30 // s/km

export function isExcluded(a) {
  const pace = a.t / (a.d / 1000)
  return a.start.startsWith('2026') && pace > SLOW_2026
}

export const keepRuns = (raw) => raw.filter((a) => !isExcluded(a))
