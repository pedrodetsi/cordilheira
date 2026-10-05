import { fmtKm } from '../lib/insights'
import { brDate } from './Header'

// Tela de abertura: a câmera voa sobre a cordilheira enquanto os picos nascem.
export default function Intro({ stats, syncDate, onExplore }) {
  return (
    <div className="panel intro">
      <div className="intro-title">
        <span className="eyebrow">Seu histórico de corridas</span>
        <h1>Cordilheira</h1>
        <p>Cada corrida é um pico. A altura é a distância.</p>
      </div>
      <div className="intro-stats">
        <div><strong>{stats.count}</strong><span>corridas</span></div>
        <div><strong>{fmtKm(stats.totalKm, 0)}</strong><span>km no total</span></div>
        <div><strong className="rec">{fmtKm(stats.record.km)}</strong><span>km de recorde</span></div>
      </div>
      <button className="cta" onClick={onExplore}>Explorar a cordilheira</button>
      <span className="muted intro-sync">sincronizado com o Strava · {brDate(syncDate)}</span>
    </div>
  )
}
