import { useEffect, useMemo, useState } from 'react'
import { fmtKm, fmtPace } from '../lib/insights'
import { PERIODS, WEEKDAYS, computeBI, sanitizeBI, biDefaults } from '../lib/runnerBI'
import { brDate } from './Header'

const STORE = 'cordilheira.runnerBI'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORE)) } catch { return null }
}

// Runner BI: indicadores de desempenho em tela cheia (sempre no visual claro).
export default function RunnerBI({ runs, updatedAt, syncDate, onClose }) {
  const [s, setS] = useState(() => sanitizeBI(loadSaved(), runs, updatedAt))
  const set = (p) => setS((o) => ({ ...o, ...(typeof p === 'function' ? p(o) : p) }))

  useEffect(() => {
    try {
      const { filtersOpen, ...keep } = s
      localStorage.setItem(STORE, JSON.stringify(keep))
    } catch { /* armazenamento indisponível: segue sem persistir */ }
  }, [s])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const bi = useMemo(() => computeBI(runs, updatedAt, s), [runs, updatedAt, s])
  const b = bi.bounds

  const resetFilters = () => {
    const d = biDefaults(runs, updatedAt)
    set({ kmMin: d.kmMin, kmMax: d.kmMax, paceMin: d.paceMin, paceMax: d.paceMax, days: d.days })
  }
  const toggleDay = (i) => set((o) => {
    const d = [...o.days]
    d[i] = d[i] ? 0 : 1
    return { days: d.some(Boolean) ? d : o.days }
  })

  return (
    <div className="bi" role="dialog" aria-label="Runner BI">
      <div className="bi-scroll">
        <div className="bi-top">
          <button className="bi-back" onClick={onClose}>‹ Mapa</button>
          <span className="bi-muted bi-sync">Strava · {brDate(syncDate)}</span>
        </div>
        <div className="bi-title">
          <h1>Runner BI</h1>
          <span className="bi-muted">{bi.rangeLabel}</span>
        </div>

        <div className="bi-periods">
          {PERIODS.map(([k, label]) => (
            <button key={k} className={`bi-chip ${s.period === k ? 'on' : ''}`} onClick={() => set({ period: k })}>
              {label}
            </button>
          ))}
        </div>

        {s.period === 'custom' && (
          <div className="bi-dates">
            <label>De<input type="date" value={s.from} onChange={(e) => set({ from: e.target.value })} /></label>
            <label>Até<input type="date" value={s.to} onChange={(e) => set({ to: e.target.value })} /></label>
          </div>
        )}

        <button className="bi-filters-toggle" onClick={() => set((o) => ({ filtersOpen: !o.filtersOpen }))}>
          <span>Filtros</span>
          <span className="bi-muted">{bi.filterSummary} {s.filtersOpen ? '▴' : '▾'}</span>
        </button>

        {s.filtersOpen && (
          <div className="bi-card bi-filters">
            <div className="bi-range">
              <div className="bi-range-head">
                <span className="bi-label">Distância</span>
                <strong>{fmtKm(s.kmMin)} – {fmtKm(s.kmMax)} km</strong>
              </div>
              <label>Mínima<input
                type="range" min={b.kmLo} max={b.kmHi} step="0.5" value={s.kmMin} className="acc-rec"
                onChange={(e) => { const v = +e.target.value; set((o) => ({ kmMin: Math.min(v, o.kmMax) })) }}
              /></label>
              <label>Máxima<input
                type="range" min={b.kmLo} max={b.kmHi} step="0.5" value={s.kmMax} className="acc-rec"
                onChange={(e) => { const v = +e.target.value; set((o) => ({ kmMax: Math.max(v, o.kmMin) })) }}
              /></label>
            </div>
            <div className="bi-sep" />
            <div className="bi-range">
              <div className="bi-range-head">
                <span className="bi-label">Ritmo</span>
                <strong>{fmtPace(s.paceMin)} – {fmtPace(s.paceMax)} /km</strong>
              </div>
              <label>Mais rápido<input
                type="range" min={b.paceLo} max={b.paceHi} step="5" value={s.paceMin} className="acc-goal"
                onChange={(e) => { const v = +e.target.value; set((o) => ({ paceMin: Math.min(v, o.paceMax) })) }}
              /></label>
              <label>Mais lento<input
                type="range" min={b.paceLo} max={b.paceHi} step="5" value={s.paceMax} className="acc-goal"
                onChange={(e) => { const v = +e.target.value; set((o) => ({ paceMax: Math.max(v, o.paceMin) })) }}
              /></label>
            </div>
            <div className="bi-sep" />
            <div className="bi-days-wrap">
              <span className="bi-label">Dia da semana</span>
              <div className="bi-days">
                {WEEKDAYS.map((l, i) => (
                  <button key={l} className={`bi-day ${s.days[i] ? 'on' : ''}`} onClick={() => toggleDay(i)}>{l}</button>
                ))}
              </div>
            </div>
            <button className="bi-reset" onClick={resetFilters}>Limpar filtros</button>
          </div>
        )}

        <div className="bi-count">
          <strong>{bi.nTxt}</strong>
          <span className="bi-muted">{bi.cmpLabel}</span>
        </div>

        {bi.empty ? (
          <div className="bi-card bi-empty">
            Nenhuma corrida com esses filtros. Tente outro período ou amplie as faixas.
          </div>
        ) : (
          <>
            <div className="bi-kpis">
              {bi.kpis.map((k) => (
                <div key={k.label} className="bi-card bi-kpi">
                  <span className="bi-label">{k.label}</span>
                  <span className="bi-num">{k.val}{k.unit && <em> {k.unit}</em>}</span>
                  <span className="bi-delta" style={{ color: k.c }}>{k.txt}</span>
                </div>
              ))}
            </div>

            <div className="bi-card">
              <span className="bi-label">Ritmo</span>
              <div className="bi-two">
                <div>
                  <span className="bi-sub">Médio</span>
                  <span className="bi-num">{bi.avgPace}<em> /km</em></span>
                  <span className="bi-delta" style={{ color: bi.paceDeltaC }}>{bi.paceDelta}</span>
                </div>
                <div>
                  <span className="bi-sub">Melhor corrida</span>
                  <span className="bi-num rec">{bi.bestPace}<em> /km</em></span>
                  <span className="bi-muted bi-small">{bi.bestPaceSub}</span>
                </div>
              </div>
              {bi.paceChart && (
                <div className="bi-chart">
                  <div className="bi-chart-head">
                    <span>Evolução do ritmo</span>
                    <span style={{ color: bi.paceChart.trendC }}>{bi.paceChart.trendTxt}</span>
                  </div>
                  <div className="bi-chart-body">
                    <div className="bi-axis"><span>{bi.paceChart.fast}</span><span>{bi.paceChart.slow}</span></div>
                    <svg viewBox="0 0 270 110" preserveAspectRatio="none" aria-label="Evolução do ritmo">
                      <path d={bi.paceChart.dots} stroke="#cdbfac" strokeWidth="4" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
                      <path d={bi.paceChart.line} stroke="#c27a1e" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                  <div className="bi-chart-foot">
                    <span>{bi.paceChart.from}</span>
                    <span>pontos = corridas · linha = média de 5</span>
                    <span>{bi.paceChart.to}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bi-card bi-prs">
              <span className="bi-label">Recordes no período</span>
              <div className="bi-pr">
                <div><strong>Maior corrida</strong><span className="bi-muted bi-small">{bi.longestSub}</span></div>
                <span className="bi-pr-val rec">{bi.longest} km</span>
              </div>
              {bi.prs.map((r) => (
                <div key={r.label} className="bi-pr">
                  <div><strong>{r.label}</strong><span className="bi-muted bi-small">{r.sub}</span></div>
                  <span className="bi-pr-val">{r.time}</span>
                </div>
              ))}
              <span className="bi-muted bi-note">
                Tempos estimados pelo ritmo médio das corridas com pelo menos essa distância.
              </span>
            </div>

            <div className="bi-card">
              <div className="bi-row">
                <span className="bi-label">Km por semana</span>
                <span className="bi-delta" style={{ color: bi.weekly.deltaC }}>{bi.weekly.delta}</span>
              </div>
              <span className="bi-num">{bi.weekly.avg}<em> km/semana em média</em></span>
              {bi.weekly.bars && (
                <>
                  <div className="bi-weeks">
                    {bi.weekly.bars.map((w, i) => (
                      <div key={i} style={{ height: `${w.h}%`, background: w.c }} />
                    ))}
                  </div>
                  <div className="bi-chart-foot">
                    <span>{bi.weekly.from}</span><span>{bi.weekly.note}</span><span>{bi.weekly.to}</span>
                  </div>
                </>
              )}
            </div>

            <div className="bi-card">
              <span className="bi-label">Sequência</span>
              <div className="bi-three">
                <div><span className="bi-num good">{bi.curWeeks}</span><span className="bi-muted bi-small">semanas seguidas, até agora</span></div>
                <div><span className="bi-num">{bi.maxWeeks}</span><span className="bi-muted bi-small">maior sequência de semanas</span></div>
                <div><span className="bi-num">{bi.maxDays}</span><span className="bi-muted bi-small">maior sequência de dias</span></div>
              </div>
            </div>

            <div className="bi-card">
              <span className="bi-label">Quando você corre</span>
              <div className="bi-wd">
                {bi.wd.map((w) => (
                  <div key={w.label}>
                    <span className="bi-wd-n">{w.n}</span>
                    <div className="bi-wd-bar"><div style={{ height: `${w.h}%`, background: w.c }} /></div>
                    <span className="bi-wd-l">{w.label}</span>
                  </div>
                ))}
              </div>
              <div className="bi-tod">
                {bi.tod.map((t) => (
                  <div key={t.label}>
                    <span>{t.label}</span>
                    <div className="bi-tod-bar"><div style={{ width: `${t.w}%`, background: t.c }} /></div>
                    <span className="bi-tod-pct">{t.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="bi-fade" />
    </div>
  )
}
