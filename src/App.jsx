import { useMemo, useState } from 'react'
import { RAW } from './data/activities'
import {
  enrich, computeStats, detectPlateaus, monthlyAverages,
  computeTrend, computeGoal, matchesFilters,
} from './lib/insights'
import { buildLayout } from './lib/layout'
import Scene from './scene/Scene'
import Header from './ui/Header'
import Filters from './ui/Filters'
import DetailCard from './ui/DetailCard'
import Legend from './ui/Legend'

const EMPTY_FILTERS = {
  paceMin: null, paceMax: null, kmMin: null, kmMax: null, periods: [], years: [],
}

export default function App() {
  const runs = useMemo(() => enrich(RAW), [])
  const layout = useMemo(() => buildLayout(runs), [runs])
  const stats = useMemo(() => computeStats(runs), [runs])
  const plateaus = useMemo(() => detectPlateaus(runs), [runs])
  const monthly = useMemo(() => monthlyAverages(runs), [runs])
  const trend = useMemo(() => computeTrend(runs), [runs])
  const goal = useMemo(() => computeGoal(runs), [runs])

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selected, setSelected] = useState(null)

  const matchedIds = useMemo(
    () => new Set(runs.filter((r) => matchesFilters(r, filters)).map((r) => r.id)),
    [runs, filters]
  )
  const years = useMemo(() => [...new Set(runs.map((r) => r.year))], [runs])

  const selectedInPlateau =
    selected && plateaus.some((p) => p.inIds.has(selected.id))

  return (
    <div className="app">
      <Scene
        runs={runs}
        layout={layout}
        matchedIds={matchedIds}
        selectedId={selected?.id}
        onSelect={setSelected}
        onHover={() => {}}
        plateaus={plateaus}
        monthly={monthly}
        trend={trend}
        goal={goal}
        record={stats.record}
      />
      <Header stats={stats} trend={trend} goal={goal} />
      <Filters
        filters={filters}
        setFilters={setFilters}
        years={years}
        matchedCount={matchedIds.size}
        total={runs.length}
      />
      <DetailCard
        run={selected}
        isRecord={selected?.id === stats.record.id}
        inPlateau={selectedInPlateau}
        onClose={() => setSelected(null)}
      />
      <Legend />
    </div>
  )
}
