import { useState } from 'react'
import { parsePace } from '../lib/insights'

const PERIODS = [
  ['manha', 'Manhã'],
  ['almoco', 'Almoço'],
  ['tarde', 'Tarde'],
  ['noite', 'Noite'],
]

// Filtros do mapa (destacam as corridas que batem; as outras esmaecem).
export default function Filters({ filters, setFilters, empty, years, matchedCount, total, onClose }) {
  const [paceMinTxt, setPaceMinTxt] = useState(() => fmtPaceInput(filters.paceMin))
  const [paceMaxTxt, setPaceMaxTxt] = useState(() => fmtPaceInput(filters.paceMax))

  const set = (patch) => setFilters((f) => ({ ...f, ...patch }))
  const toggle = (key, value) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }))

  const applyPace = (minTxt, maxTxt) =>
    set({ paceMin: parsePace(minTxt), paceMax: parsePace(maxTxt) })

  const clear = () => {
    setPaceMinTxt('')
    setPaceMaxTxt('')
    setFilters(empty)
  }

  const active = matchedCount !== total

  return (
    <div className="panel sheet filters">
      <div className="grip" />
      <div className="sheet-head">
        <h2>Filtros</h2>
        <button className="sheet-done" onClick={onClose}>Concluir</button>
      </div>

      <div className="filters-grid">
        <fieldset>
          <legend>Ritmo (min/km)</legend>
          <div className="range-inputs">
            <input
              type="text" inputMode="numeric" placeholder="4:30" value={paceMinTxt}
              onChange={(e) => { setPaceMinTxt(e.target.value); applyPace(e.target.value, paceMaxTxt) }}
            />
            <span>a</span>
            <input
              type="text" inputMode="numeric" placeholder="7:00" value={paceMaxTxt}
              onChange={(e) => { setPaceMaxTxt(e.target.value); applyPace(paceMinTxt, e.target.value) }}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend>Distância (km)</legend>
          <div className="range-inputs">
            <input
              type="number" min="0" step="0.5" inputMode="decimal" placeholder="mín"
              value={filters.kmMin ?? ''}
              onChange={(e) => set({ kmMin: e.target.value === '' ? null : Number(e.target.value) })}
            />
            <span>a</span>
            <input
              type="number" min="0" step="0.5" inputMode="decimal" placeholder="máx"
              value={filters.kmMax ?? ''}
              onChange={(e) => set({ kmMax: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </div>
        </fieldset>
      </div>

      <fieldset>
        <legend>Período do dia</legend>
        <div className="chips">
          {PERIODS.map(([k, label]) => (
            <button
              key={k}
              className={`chip ${filters.periods.includes(k) ? 'on' : ''}`}
              onClick={() => toggle('periods', k)}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Ano</legend>
        <div className="chips">
          {years.map((y) => (
            <button
              key={y}
              className={`chip ${filters.years.includes(y) ? 'on' : ''}`}
              onClick={() => toggle('years', y)}
            >
              {y}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="filters-foot">
        <span className="muted">{matchedCount} de {total} corridas</span>
        <button className="clear" onClick={clear} disabled={!active}>Limpar</button>
      </div>
    </div>
  )
}

function fmtPaceInput(sec) {
  if (sec == null) return ''
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}
