import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Ambiente da cena: mescla o CICLO DIA/NOITE (hora real do usuário) com o CLIMA
// atual do Rio de Janeiro (Open-Meteo, sem chave, CORS liberado).
//
// Estados de clima: 'clear' | 'cloudy' | 'rain'. Estados de tempo derivam da
// hora via keyframes interpolados, então a passagem manhã→tarde→noite é suave.
// Overrides por URL para teste: ?hour=21 &weather=rain (&noweather p/ pular fetch)
// ─────────────────────────────────────────────────────────────────────────────

const RIO = { lat: -22.9068, lon: -43.1729 }

// Keyframes do céu limpo ao longo do dia (hora 0–24, com wrap).
const KF = [
  { h: 0.0,  top: '#2b3f63', mid: '#3c527a', low: '#4d6690', light: '#aabcde', li: 0.62, hi: 0.68 },
  { h: 5.3,  top: '#41537a', mid: '#9a8892', low: '#e6a866', light: '#ffbb82', li: 0.7,  hi: 0.66 },
  { h: 6.6,  top: '#7c9fc9', mid: '#e8c39a', low: '#ffcf94', light: '#ffcf9a', li: 0.9,  hi: 0.72 },
  { h: 8.0,  top: '#a9c8e8', mid: '#eaf2f8', low: '#ffe6c2', light: '#ffe6b8', li: 1.12, hi: 0.86 },
  { h: 12.0, top: '#bfdff2', mid: '#e9f4fa', low: '#ffedd0', light: '#fff2d8', li: 1.3,  hi: 0.9  },
  { h: 16.0, top: '#b7d4ec', mid: '#eef1ea', low: '#ffe1b2', light: '#ffdca2', li: 1.15, hi: 0.85 },
  { h: 17.6, top: '#6f8ec0', mid: '#f2b06a', low: '#ff8f4d', light: '#ff9a58', li: 1.0,  hi: 0.62 },
  { h: 18.8, top: '#44598a', mid: '#b1738a', low: '#e08a5a', light: '#d69a86', li: 0.68, hi: 0.58 },
  { h: 20.0, top: '#31456a', mid: '#3e5680', low: '#506a92', light: '#a2b4d8', li: 0.62, hi: 0.66 },
  { h: 24.0, top: '#2b3f63', mid: '#3c527a', low: '#4d6690', light: '#aabcde', li: 0.62, hi: 0.68 },
]

const _a = new THREE.Color()
const _b = new THREE.Color()
function mix(hexA, hexB, t) {
  return _a.set(hexA).lerp(_b.set(hexB), t).getStyle()
}
function toward(hex, target, amt) {
  return _a.set(hex).lerp(_b.set(target), amt).getStyle()
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x))

function sampleDay(hour) {
  let i = 0
  while (i < KF.length - 1 && KF[i + 1].h <= hour) i++
  const a = KF[i]
  const b = KF[Math.min(i + 1, KF.length - 1)]
  const span = b.h - a.h || 1
  const t = clamp((hour - a.h) / span, 0, 1)
  return {
    top: mix(a.top, b.top, t),
    mid: mix(a.mid, b.mid, t),
    low: mix(a.low, b.low, t),
    light: mix(a.light, b.light, t),
    li: a.li + (b.li - a.li) * t,
    hi: a.hi + (b.hi - a.hi) * t,
  }
}

// Código WMO do Open-Meteo → nossa categoria de clima.
export function classifyWeather(code) {
  if (code == null) return 'clear'
  if (code <= 1) return 'clear'
  if (code <= 48) return 'cloudy' // 2,3 nublado; 45,48 névoa
  return 'rain' // 51+ chuvisco/chuva/neve/trovoada
}

export async function fetchWeather() {
  const o = weatherOverride()
  if (o) return o
  if (new URLSearchParams(location.search).has('noweather')) return 'clear'
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${RIO.lat}&longitude=${RIO.lon}` +
      `&current=weather_code&timezone=America%2FSao_Paulo`
    const res = await fetch(url)
    const data = await res.json()
    return classifyWeather(data?.current?.weather_code)
  } catch {
    return 'clear'
  }
}

export function currentHour() {
  const p = new URLSearchParams(location.search).get('hour')
  if (p != null && p !== '') return clamp(parseFloat(p), 0, 24)
  const d = new Date()
  return d.getHours() + d.getMinutes() / 60
}

function weatherOverride() {
  const w = new URLSearchParams(location.search).get('weather')
  return w === 'clear' || w === 'cloudy' || w === 'rain' ? w : null
}

// Monta o descritor completo do ambiente para a cena.
export function computeEnvironment(hour, weather) {
  const day = sampleDay(hour)
  const isNight = hour < 5.3 || hour >= 19.4
  const isTwilight = (hour >= 5.3 && hour < 6.8) || (hour >= 17.2 && hour < 19.4)

  let { top, mid, low, light, li, hi } = day

  // posição do sol pelo arco do dia (nascer ~6h a leste, poente ~18h a oeste)
  const ang = ((hour - 6) / 12) * Math.PI
  const sunY = Math.sin(ang) * 46 + 4
  const sun = [-Math.cos(ang) * 62, sunY, -34]

  let showSun = weather === 'clear' && sunY > 3
  let showMoon = weather !== 'rain' && isNight
  let starBase = isNight ? 1 : isTwilight ? 0.35 : 0
  let cloudOpacity = 0
  let rainIntensity = 0
  let fogNear = 80
  let fogFar = 235

  if (weather === 'cloudy') {
    const g = '#d4dae0'
    top = toward(top, g, 0.42); mid = toward(mid, g, 0.42); low = toward(low, g, 0.36)
    light = toward(light, '#e8ebec', 0.35)
    li *= 0.74; hi *= 0.92
    cloudOpacity = 0.55
    starBase *= 0.22
    showSun = false
    fogNear = 66; fogFar = 188
  } else if (weather === 'rain') {
    const g = '#8e97a0'
    top = toward(top, g, 0.55); mid = toward(mid, g, 0.55); low = toward(low, g, 0.5)
    light = toward(light, '#aeb6bd', 0.5)
    li *= 0.52; hi *= 0.86
    cloudOpacity = 0.85
    rainIntensity = 1
    starBase = 0
    showSun = false; showMoon = false
    fogNear = 46; fogFar = 150
  }

  // chão: escurece à noite, "molha" (esverdeado-frio) na chuva
  let ground = mix('#33404f', '#edf4f9', clamp(day.li / 1.25, 0, 1))
  if (weather === 'rain') ground = toward(ground, '#aab6bf', 0.4)

  const moon = [-24, 27, -26]

  return {
    hour, weather, isNight,
    sky: { top, mid, low },
    hemi: { sky: top, ground: low, intensity: hi },
    sun: { position: sun, color: light, intensity: li, show: showSun },
    moon: { position: moon, show: showMoon, opacity: weather === 'cloudy' ? 0.5 : 1 },
    fill: { color: mix('#cfe6f7', '#3a5578', clamp(1 - day.li / 1.3, 0, 1)), intensity: 0.3 + (1 - clamp(day.li / 1.3, 0, 1)) * 0.15 },
    stars: clamp(starBase, 0, 1),
    cloudOpacity,
    rainIntensity,
    fog: { color: mix(mid, top, 0.4), near: fogNear, far: fogFar },
    ground,
  }
}
