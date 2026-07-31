// ─────────────────────────────────────────────────────────────────────────────
// Adaptador Strava → Cordilheira.
//
// O app inteiro consome apenas o formato { start, d, t, e } (data local ISO,
// distância em metros, tempo em movimento em segundos, ganho de elevação em
// metros). Para atualizar com
// dados novos do Strava, basta mapear a resposta da API (ou do MCP do Strava)
// com `fromStrava` e passar o resultado para `enrich()` em vez de RAW.
//
// Exemplo com a API oficial (GET /athlete/activities):
//   const raw = fromStrava(await fetchAllActivities(token))
//
// Para atualização automática/periódica: agende um job que regrave
// src/data/activities.js (ou sirva um JSON estático) — nenhum outro arquivo
// precisa mudar.
// ─────────────────────────────────────────────────────────────────────────────

export function fromStrava(activities) {
  return activities
    .filter((a) => (a.sport_type ?? a.type) === 'Run')
    .map((a) => ({
      start: a.start_date_local ?? a.start_local,
      d: a.distance ?? a.summary?.distance,
      t: a.moving_time ?? a.summary?.moving_time,
      e: a.elevation_gain ?? a.summary?.elevation_gain ?? 0,
    }))
    .filter((a) => a.start && a.d > 0 && a.t > 0)
}
