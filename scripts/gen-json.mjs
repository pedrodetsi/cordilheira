// Regenera public/activities.json a partir do array RAW embutido.
// (O sync com o Strava sobrescreve este arquivo — veja scripts/sync-strava.md)
import { writeFileSync } from 'node:fs'
import { RAW } from '../src/data/activities.js'

const payload = {
  updatedAt: process.argv[2] ?? null,
  activities: RAW.map((a) => ({ start: a.start, d: a.d, t: a.t, e: a.e ?? 0 })),
}
writeFileSync('public/activities.json', JSON.stringify(payload))
console.log('activities.json:', payload.activities.length, 'corridas')
