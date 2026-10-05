// ─────────────────────────────────────────────────────────────────────────────
// Tema por horário de Brasília: Manhã (05–11h59) · Tarde (12–17h59) ·
// Noite (18–04h59). Cada tema traz a paleta da cena 3D ("montanha realista");
// as cores da UI vêm do CSS via [data-theme].
// Override por URL para teste: ?hour=21
// ─────────────────────────────────────────────────────────────────────────────

const BRT_HOUR = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: 'numeric',
  hourCycle: 'h23',
})

export function brasiliaHour() {
  const p = new URLSearchParams(location.search).get('hour')
  if (p != null && p !== '' && !isNaN(parseFloat(p))) return Math.min(23, Math.max(0, Math.floor(parseFloat(p))))
  return Number(BRT_HOUR.format(new Date())) % 24
}

export function themeForHour(h) {
  if (h >= 5 && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  return 'noite'
}

// Base "real" (Tarde = real + neve no solo). Fonte: peaks-scene.js do handoff.
const REAL = {
  sky: ['#5f93c6', '#c3d8e9', '#efe7da'],
  fog: '#d8e1e7', fogNear: 75, fogFar: 310,
  groundLo: '#7a7559', groundHi: '#9a9282',
  hemi: ['#c2d7ea', '#5e503c', 0.75],
  sun: ['#ffe0ad', 3.0], sunDir: [-0.7, 0.55, 0.35],
  exposure: 1.0,
  base: '#433b33', mid: '#8a7f70', snow: '#f5f7f9', snowAbs: 2.5,
  seg: 9, hseg: 7, radius: 1.35, jitter: 0.2, rough: 0.95,
  gold: '#d9902a', goldDeep: '#7d4e16', goldEm: 0.12,
  trend: '#2e9e77', goal: '#1e7d9c', select: '#2b2620',
  groundSnow: 0.6, groundSnowC: '#eef1f4',
  sunSprite: '#fff1d6', sunPos: [-110, 40, -150], sunScale: 45,
  stars: false, glow: false, glowy: false,
  label: '#857a6c',
}

export const SCENE_THEMES = {
  tarde: REAL,
  manha: {
    ...REAL,
    sky: ['#86a3c8', '#f1cdb6', '#ffd7a3'],
    fog: '#efd8c6', fogNear: 55, fogFar: 260,
    groundLo: '#7a6a58', groundHi: '#a08f80',
    hemi: ['#f6dccb', '#5a4636', 0.85],
    sun: ['#ffc48a', 2.7], sunDir: [0.85, 0.3, -0.25],
    base: '#4a3c35', mid: '#9c8272', snow: '#fff0e4',
    groundSnowC: '#f8e9df',
    gold: '#e0962e', goldDeep: '#83501a',
    sunSprite: '#ffcf96', sunPos: [160, 16, -110], sunScale: 55,
    label: '#8e7466',
  },
  noite: {
    ...REAL,
    sky: ['#050a16', '#122039', '#2b3b57'],
    fog: '#17243a', fogNear: 60, fogFar: 270,
    groundLo: '#33343a', groundHi: '#464a54',
    hemi: ['#7189ad', '#1a1c24', 0.9],
    sun: ['#c4d4f2', 2.0], sunDir: [0.4, 0.6, -0.55],
    exposure: 1.3,
    base: '#2c2d35', mid: '#646a7c', snow: '#d4e0f2', rough: 0.9,
    groundSnowC: '#8d9eb8',
    gold: '#ffbf4d', goldDeep: '#a8661d', goldEm: 0.75,
    trend: '#4fd1a1', goal: '#5fe0f5', select: '#ffffff',
    sunSprite: '#dbe6ff', sunPos: [70, 70, -180], sunScale: 20,
    stars: true, glow: true, glowy: true,
    label: '#9a9eaa',
  },
}

// Cor do <meta name="theme-color"> (barra do navegador) por tema.
export const THEME_COLOR = { manha: '#fcf4ec', tarde: '#f8f6f1', noite: '#1c2029' }
