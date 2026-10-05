import * as THREE from 'three'
import { SCENE_THEMES } from './theme'

// ─────────────────────────────────────────────────────────────────────────────
// Ambiente da cena: paleta do TEMA (manhã/tarde/noite, por horário de Brasília)
// com o CLIMA atual do Rio de Janeiro sobreposto (Open-Meteo, sem chave).
//
// Estados de clima: 'clear' | 'cloudy' | 'rain'.
// Overrides por URL para teste: ?hour=21 &weather=rain (&noweather p/ pular fetch)
// ─────────────────────────────────────────────────────────────────────────────

const RIO = { lat: -22.9068, lon: -43.1729 }

const _a = new THREE.Color()
const _b = new THREE.Color()
function toward(hex, target, amt) {
  return '#' + _a.set(hex).lerp(_b.set(target), amt).getHexString()
}

// Código WMO do Open-Meteo → nossa categoria de clima.
export function classifyWeather(code) {
  if (code == null) return 'clear'
  if (code <= 1) return 'clear'
  if (code <= 48) return 'cloudy' // 2,3 nublado; 45,48 névoa
  return 'rain' // 51+ chuvisco/chuva/neve/trovoada
}

// → { kind: 'clear'|'cloudy'|'rain', temp: número em °C ou null }
export async function fetchWeather() {
  const o = weatherOverride()
  if (o) return { kind: o, temp: null }
  if (new URLSearchParams(location.search).has('noweather')) return { kind: 'clear', temp: null }
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${RIO.lat}&longitude=${RIO.lon}` +
      `&current=weather_code,temperature_2m&timezone=America%2FSao_Paulo`
    const res = await fetch(url)
    const data = await res.json()
    const t = data?.current?.temperature_2m
    return {
      kind: classifyWeather(data?.current?.weather_code),
      temp: typeof t === 'number' ? Math.round(t) : null,
    }
  } catch {
    return { kind: 'clear', temp: null }
  }
}

function weatherOverride() {
  const w = new URLSearchParams(location.search).get('weather')
  return w === 'clear' || w === 'cloudy' || w === 'rain' ? w : null
}

// Monta o descritor completo do ambiente para a cena.
export function computeEnvironment(theme, weather) {
  const P = SCENE_THEMES[theme]
  const night = theme === 'noite'
  let sky = [...P.sky]
  let fog = P.fog, fogNear = P.fogNear, fogFar = P.fogFar
  let sunI = P.sun[1], hemiI = P.hemi[2]
  let showSun = true
  let moonOpacity = 1
  let stars = P.stars ? 1 : 0
  let cloudOpacity = 0
  let rainIntensity = 0

  if (weather === 'cloudy') {
    const g = night ? '#2a3140' : '#d4dae0'
    sky = [toward(sky[0], g, 0.42), toward(sky[1], g, 0.42), toward(sky[2], g, 0.36)]
    fog = toward(fog, g, 0.3)
    sunI *= 0.74; hemiI *= 0.95
    fogNear *= 0.85; fogFar *= 0.8
    cloudOpacity = night ? 0.35 : 0.55
    stars *= 0.22
    moonOpacity = 0.5
    if (!night) showSun = false
  } else if (weather === 'rain') {
    const g = night ? '#1d232d' : '#8e97a0'
    sky = [toward(sky[0], g, 0.55), toward(sky[1], g, 0.55), toward(sky[2], g, 0.5)]
    fog = toward(fog, g, 0.45)
    sunI *= 0.52; hemiI *= 0.9
    fogNear *= 0.65; fogFar *= 0.6
    cloudOpacity = night ? 0.5 : 0.85
    rainIntensity = 1
    stars = 0
    showSun = false
    moonOpacity = 0
  }

  return {
    theme, weather, night, palette: P,
    sky,
    fog: { color: fog, near: fogNear, far: fogFar },
    hemi: { sky: P.hemi[0], ground: P.hemi[1], intensity: hemiI },
    sun: { color: P.sun[0], intensity: sunI, dir: P.sunDir },
    sprite: {
      color: P.sunSprite, position: P.sunPos, scale: P.sunScale,
      opacity: night ? moonOpacity : showSun ? 1 : 0,
    },
    stars,
    cloudOpacity,
    cloudColor: night ? '#5a6578' : '#ffffff',
    rainIntensity,
    exposure: P.exposure,
  }
}
