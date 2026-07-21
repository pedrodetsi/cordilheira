import { fmtKm, fmtPace, fmtDate } from '../lib/insights'

const TREND_LABEL = {
  up: { txt: 'Subindo', icon: '▲', cls: 'up' },
  flat: { txt: 'Estável', icon: '●', cls: 'flat' },
  down: { txt: 'Caindo', icon: '▼', cls: 'down' },
}

const WEATHER_LABEL = {
  clear: { icon: '☀', txt: 'Rio ensolarado' },
  cloudy: { icon: '☁', txt: 'Rio nublado' },
  rain: { icon: '🌧', txt: 'Rio chuvoso' },
}

export default function Header({ stats, trend, goal, weather, syncedAt }) {
  const t = TREND_LABEL[trend.dir]
  const w = WEATHER_LABEL[weather] ?? WEATHER_LABEL.clear
  const sync = syncedAt
    ? `sincronizado com o Strava · ${new Date(syncedAt).toLocaleDateString('pt-BR')}`
    : 'cada pico é uma corrida, a altura é a distância'
  return (
    <header className="panel header">
      <div className="brand">
        <h1>Cordilheira</h1>
        <p className="tagline">{stats.count} corridas · {sync}</p>
      </div>
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Total percorrido</span>
          <span className="stat-value">{fmtKm(stats.totalKm, 0)} <em>km</em></span>
        </div>
        <div className="stat record">
          <span className="stat-label">Recorde atual</span>
          <span className="stat-value">{fmtKm(stats.record.km)} <em>km</em></span>
          <span className="stat-sub">{fmtDate(stats.record.date)} · {fmtPace(stats.record.pace)}/km</span>
        </div>
        <div className={`stat trend-${t.cls}`}>
          <span className="stat-label">Tendência (8 sem.)</span>
          <span className="stat-value trend-txt">{t.icon} {t.txt}</span>
          {trend.recentAvg && (
            <span className="stat-sub">
              média {fmtKm(trend.beforeAvg)} → {fmtKm(trend.recentAvg)} km
            </span>
          )}
        </div>
        <div className="stat goal">
          <span className="stat-label">Próximo pico</span>
          <span className="stat-value">{fmtKm(goal.goalKm)} <em>km</em></span>
          <span className="stat-sub">+10% sobre {fmtKm(goal.baseKm)} km recentes</span>
        </div>
        <div className="stat weather">
          <span className="stat-label">Ambiente agora</span>
          <span className="stat-value weather-txt">{w.icon}</span>
          <span className="stat-sub">{w.txt}</span>
        </div>
      </div>
    </header>
  )
}
