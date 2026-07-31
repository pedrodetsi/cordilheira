import { fmtKm, fmtPace, fmtDur, fmtDate, periodOfDay } from '../lib/insights'

const PERIOD_LABEL = { manha: 'manhã', almoco: 'almoço', tarde: 'tarde', noite: 'noite' }

// rótulo do terreno conforme ganho de elevação por km
function terrainLabel(elevPerKm) {
  if (elevPerKm >= 15) return 'montanhoso'
  if (elevPerKm >= 6) return 'ondulado'
  return 'plano'
}

export default function DetailCard({ run, isRecord, inPlateau, onClose }) {
  if (!run) return null
  return (
    <div className="panel detail">
      <button className="close" onClick={onClose} aria-label="Fechar">×</button>
      <p className="detail-date">{fmtDate(run.date)} · {PERIOD_LABEL[periodOfDay(run.hour)]}</p>
      <p className="detail-km">{fmtKm(run.km, 2)} <em>km</em></p>
      <div className="detail-grid">
        <div><span>Ritmo</span><strong>{fmtPace(run.pace)}/km</strong></div>
        <div><span>Duração</span><strong>{fmtDur(run.seconds)}</strong></div>
        <div>
          <span>Elevação</span>
          <strong>{Math.round(run.elevGain)} m <em className="terrain">· {terrainLabel(run.elevPerKm)}</em></strong>
        </div>
      </div>
      <div className="badges">
        {isRecord && <span className="badge gold">🏔 Recorde atual</span>}
        {!isRecord && run.wasPR && <span className="badge amber">✦ Foi recorde na época</span>}
        {inPlateau && <span className="badge ice">≋ Dentro de um planalto</span>}
      </div>
    </div>
  )
}
