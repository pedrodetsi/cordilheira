import { useState } from 'react'
import { parsePace } from '../lib/insights'

const PERIODS = [
  ['manha', 'Manhã'],
  ['almoco', 'Almoço'],
  ['tarde', 'Tarde'],
  ['noite', 'Noite'],
]

export default function Filters({ filters, setFilters, years, matchedCount, total }) {
  const [open, setOpen] = useState(false)
  const [paceMinTxt, setPaceMinTxt] = useState('')
  const [paceMaxTxt, setPaceMaxTxt] = useState('')

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
    setFilters({ paceMin: null, paceMax: null, kmMin: null, kmMax: null, periods: [], years: [] })
  }

  const active =
    filters.paceMin != null || filters.paceMax != null || filters.kmMin != null ||
    filters.kmMax != null || filters.periods.length > 0 || filters.years.length > 0

  return (
    <div className={`panel filters ${open ? 'open' : ''}`}>
      <button className="filters-toggle" onClick={() => setOpen(!open)}>
        <span>Filtros{active ? ` · ${matchedCount}/${total}` : ''}</span>
        <span className="chev">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="filters-body">
          <fieldset>
            <legend>Faixa de ritmo (min/km)</legend>
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
                type="number" min="0" step="0.5" placeholder="mín"
                value={filters.kmMin ?? ''}
                onChange={(e) => set({ kmMin: e.target.value === '' ? null : Number(e.target.value) })}
              />
              <span>a</span>
              <input
                type="number" min="0" step="0.5" placeholder="máx"
                value={filters.kmMax ?? ''}
                onChange={(e) => set({ kmMax: e.target.value === '' ? null : Number(e.target.value) })}
              />
            </div>
          </fieldset>

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
            <span className="count">{matchedCount} de {total} corridas</span>
            <button className="clear" onClick={clear} disabled={!active}>Limpar</button>
          </div>
        </div>
      )}
    </div>
  )
}
