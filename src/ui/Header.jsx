import { fmtKm } from '../lib/insights'

const TREND_LABEL = {
  up: { txt: 'Subindo', icon: '▲' },
  flat: { txt: 'Estável', icon: '●' },
  down: { txt: 'Caindo', icon: '▼' },
}

const WEATHER_ICON = { clear: '☀', cloudy: '☁', rain: '☂' }

// AAAA-MM-DD → DD/MM/AAAA, sem passar por Date (evita drift de fuso)
export const brDate = (iso) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split('-').reverse().join('/') : iso ?? ''

export const longDate = (d) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

export default function Header({ stats, trend, goal, weather, syncDate }) {
  const t = TREND_LABEL[trend.dir]
  return (
    <header className="panel header">
      <div className="header-top">
        <div className="brand">
          <h1>Cordilheira</h1>
          <p className="muted">{stats.count} corridas · Strava {brDate(syncDate)}</p>
        </div>
        <span className="pill weather" title="Clima agora no Rio">
          {WEATHER_ICON[weather.kind] ?? '☀'} {weather.temp != null ? `${weather.temp}°` : 'Rio'}
        </span>
      </div>
      <div className="header-stats">
        <div className="stat">
          <span className="stat-label">Recorde atual</span>
          <span className="stat-value rec">{fmtKm(stats.record.km)}<em> km</em></span>
          <span className="stat-sub">{longDate(stats.record.date)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">8 semanas</span>
          <span className={`stat-trend trend-${trend.dir}`}>{t.icon} {t.txt}</span>
          {trend.recentAvg != null && (
            <span className="stat-sub">{fmtKm(trend.beforeAvg)} → {fmtKm(trend.recentAvg)} km</span>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Próximo pico</span>
          <span className="stat-goal">{fmtKm(goal.goalKm)} km</span>
          <span className="stat-sub">+10% sobre {fmtKm(goal.baseKm)} km</span>
        </div>
      </div>
    </header>
  )
}
