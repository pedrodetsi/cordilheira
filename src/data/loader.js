import { RAW } from './activities'

// Carrega as corridas em runtime. Tenta buscar um activities.json estático
// (que pode ser regravado por um job de sincronização com o Strava sem
// precisar rebuildar o app); se falhar, usa o RAW embutido como fallback.
// Assim, quando o JSON é atualizado, o mapa se reconstrói sozinho no próximo
// carregamento — sincronização automática do ponto de vista do usuário.
export async function loadRuns() {
  try {
    const url = import.meta.env.BASE_URL + 'activities.json?t=' + Date.now()
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('sem json')
    const data = await res.json()
    const list = Array.isArray(data) ? data : data.activities
    if (Array.isArray(list) && list.length) {
      return {
        raw: list.map((a) => ({ start: a.start, d: a.d, t: a.t, e: a.e ?? 0 })),
        updatedAt: data.updatedAt ?? null,
        source: 'strava',
      }
    }
  } catch {
    // silencioso: cai no fallback
  }
  return { raw: RAW, updatedAt: null, source: 'bundled' }
}
