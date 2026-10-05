import { useEffect, useMemo, useState } from 'react'
import { RAW } from './data/activities'
import { loadRuns } from './data/loader'
import {
  enrich, computeStats, detectPlateaus, monthlyAverages,
  computeTrend, computeGoal, matchesFilters,
} from './lib/insights'
import { buildLayout } from './lib/layout'
import { computeEnvironment, fetchWeather } from './lib/environment'
import { brasiliaHour, themeForHour, THEME_COLOR } from './lib/theme'
import Scene from './scene/Scene'
import Header from './ui/Header'
import Filters from './ui/Filters'
import DetailCard from './ui/DetailCard'
import Legend from './ui/Legend'
import Intro from './ui/Intro'
import RunnerBI from './ui/RunnerBI'

const EMPTY_FILTERS = {
  paceMin: null, paceMax: null, kmMin: null, kmMax: null, periods: [], years: [],
}

// Aparelho fraco → terreno mais leve, sem sombras e DPR menor.
const LOW_POWER =
  typeof navigator !== 'undefined' &&
  ((navigator.hardwareConcurrency || 8) <= 4 || (window.devicePixelRatio || 1) > 2.5)

export default function App() {
  // Dados: começa com o embutido (instantâneo) e troca pelo activities.json
  // se houver um mais recente (sincronização automática com o Strava).
  const [raw, setRaw] = useState(RAW)
  const [syncedAt, setSyncedAt] = useState(null)
  useEffect(() => {
    loadRuns().then(({ raw, updatedAt, source }) => {
      if (source === 'strava') { setRaw(raw); setSyncedAt(updatedAt) }
    })
  }, [])

  const runs = useMemo(() => enrich(raw), [raw])
  const layout = useMemo(() => buildLayout(runs), [runs])
  const stats = useMemo(() => computeStats(runs), [runs])
  const plateaus = useMemo(() => detectPlateaus(runs), [runs])
  const monthly = useMemo(() => monthlyAverages(runs), [runs])
  const trend = useMemo(() => computeTrend(runs), [runs])
  const goal = useMemo(() => computeGoal(runs), [runs])
  const inPlateau = useMemo(() => {
    const s = new Set()
    plateaus.forEach((p) => p.inIds.forEach((id) => s.add(id)))
    return s
  }, [plateaus])
  // data do sync (AAAA-MM-DD) ou, sem JSON, a da última corrida
  const syncDate = syncedAt ?? runs[runs.length - 1].id.slice(0, 10)

  // Tema por horário de Brasília (reavaliado a cada minuto) + clima do Rio.
  const [theme, setTheme] = useState(() => themeForHour(brasiliaHour()))
  const [weather, setWeather] = useState({ kind: 'clear', temp: null })
  useEffect(() => {
    fetchWeather().then(setWeather)
    const wt = setInterval(() => fetchWeather().then(setWeather), 10 * 60 * 1000)
    const ht = setInterval(() => setTheme(themeForHour(brasiliaHour())), 60 * 1000)
    return () => { clearInterval(wt); clearInterval(ht) }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [theme])
  const env = useMemo(() => computeEnvironment(theme, weather.kind), [theme, weather.kind])

  const [mode, setMode] = useState(() =>
    new URLSearchParams(location.search).has('nointro') ? 'map' : 'intro'
  )
  const [panel, setPanel] = useState(null) // null | 'filters' | 'help'
  const [biOpen, setBiOpen] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selected, setSelected] = useState(null)

  const matchedIds = useMemo(
    () => new Set(runs.filter((r) => matchesFilters(r, filters)).map((r) => r.id)),
    [runs, filters]
  )
  const years = useMemo(() => [...new Set(runs.map((r) => r.year))], [runs])
  const filtersActive = matchedIds.size !== runs.length

  const shown = selected ?? stats.record

  return (
    <div className="app">
      <Scene
        runs={runs}
        layout={layout}
        matchedIds={matchedIds}
        selected={selected}
        onSelect={setSelected}
        monthly={monthly}
        goal={goal}
        record={stats.record}
        env={env}
        mode={mode}
        lowPower={LOW_POWER}
      />

      {mode === 'intro' ? (
        <Intro stats={stats} syncDate={syncDate} onExplore={() => setMode('map')} />
      ) : (
        <>
          <Header stats={stats} trend={trend} goal={goal} weather={weather} syncDate={syncDate} />
          <div className="dock">
            <div className="fabs">
              <button className="fab fab-bi" onClick={() => setBiOpen(true)}>Runner BI</button>
              <div className="fab-row">
                <button
                  className={`fab ${panel === 'filters' ? 'on' : ''}`}
                  onClick={() => setPanel(panel === 'filters' ? null : 'filters')}
                >
                  Filtros{filtersActive && <span className="fab-count">{matchedIds.size}</span>}
                </button>
                <button
                  className={`fab fab-help ${panel === 'help' ? 'on' : ''}`}
                  aria-label="Como ler o mapa"
                  onClick={() => setPanel(panel === 'help' ? null : 'help')}
                >
                  ?
                </button>
              </div>
            </div>
            {panel === 'filters' ? (
              <Filters
                filters={filters}
                setFilters={setFilters}
                empty={EMPTY_FILTERS}
                years={years}
                matchedCount={matchedIds.size}
                total={runs.length}
                onClose={() => setPanel(null)}
              />
            ) : panel === 'help' ? (
              <Legend onClose={() => setPanel(null)} />
            ) : (
              <DetailCard
                run={shown}
                isRecord={shown.id === stats.record.id}
                inPlateau={inPlateau.has(shown.id)}
              />
            )}
          </div>
        </>
      )}

      {biOpen && <RunnerBI runs={runs} updatedAt={syncedAt} syncDate={syncDate} onClose={() => setBiOpen(false)} />}
    </div>
  )
}
