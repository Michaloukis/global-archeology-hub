import SiteProgressWidget from '../components/widgets/SiteProgressWidget.jsx'
import StratigraphicHeatmapWidget from '../components/widgets/StratigraphicHeatmapWidget.jsx'
import WeatherEnvironmentWidget from '../components/widgets/WeatherEnvironmentWidget.jsx'

function fmtInt(n) {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  } catch (_) {
    return String(n)
  }
}

function KpiCard({ label, value, detail }) {
  return (
    <div className="bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl md:text-3xl font-black tracking-tight text-ink">{value}</p>
        {detail ? <p className="text-[11px] text-ink/60 font-medium text-right">{detail}</p> : null}
      </div>
    </div>
  )
}

function BarChart({ data, ariaLabel }) {
  const values = data.map(d => d.value)
  const max = Math.max(1, ...values)

  // Chart geometry in viewBox units
  const W = 100
  const H = 44
  const pad = { l: 6, r: 2, t: 3, b: 12 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const gap = Math.min(2.5, innerW / (data.length * 8))
  const barW = (innerW - gap * (data.length - 1)) / data.length

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-56 md:h-64"
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width={W} height={H} rx="4" fill="rgba(255,255,255,0.45)" />

      {/* grid lines */}
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t)
        return <line key={t} x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="rgba(44,40,37,0.12)" strokeWidth="0.6" />
      })}

      {/* bars + labels */}
      {data.map((d, i) => {
        const v = d.value
        const h = (v / max) * innerH
        const x = pad.l + i * (barW + gap)
        const y = pad.t + (innerH - h)
        const active = i === data.length - 1
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="1.6"
              fill={active ? 'rgba(107,139,79,0.95)' : 'rgba(92,64,51,0.55)'}
            />
            <text
              x={x + barW / 2}
              y={H - 4}
              textAnchor="middle"
              fontSize="3.4"
              fill="rgba(44,40,37,0.72)"
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function DoughnutChart({ data, ariaLabel }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0))
  const palette = [
    'rgba(92,64,51,0.85)', // clay
    'rgba(44,40,37,0.78)', // ink
    'rgba(107,139,79,0.85)', // deep green
    'rgba(201,184,150,0.95)', // parchment
    'rgba(166,124,82,0.85)', // sand
  ]

  let start = 0
  const stops = data.map((d, idx) => {
    const pct = (d.value / total) * 100
    const from = start
    const to = start + pct
    start = to
    return { ...d, color: palette[idx % palette.length], from, to }
  })

  const bg = `conic-gradient(${stops.map(s => `${s.color} ${s.from}% ${s.to}%`).join(', ')})`

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch">
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div
          className="w-56 h-56 md:w-64 md:h-64 rounded-full relative border border-ink/15 shadow-[0_2px_14px_rgba(44,40,37,0.08)]"
          style={{ background: bg }}
          role="img"
          aria-label={ariaLabel}
        >
          <div className="absolute inset-7 rounded-full bg-[#f8f3e8] border border-ink/10 shadow-inner" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Total</p>
              <p className="text-2xl font-black text-ink">{fmtInt(total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2 bg-white/60 backdrop-blur-sm border border-ink/20 rounded-2xl p-4">
        <p className="text-xs font-bold text-ink mb-3">Materials</p>
        <ul className="space-y-2">
          {stops.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-sm border border-ink/20" style={{ background: s.color }} aria-hidden />
                <span className="text-sm font-medium text-ink truncate">{s.label}</span>
              </div>
              <span className="text-[11px] font-semibold text-ink/70 shrink-0">
                {Math.round((s.value / total) * 100)}% ({fmtInt(s.value)})
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function StatisticsPage() {
  // Mock data shaped like a future API response.
  const stats = {
    kpis: {
      totalArtifactsFound: 1284,
      activeDigSites: 7,
      datedSamplesC14: 93,
      totalTeamMembers: 42,
    },
    temporalDistribution: [
      { label: '5th c.', value: 26 },
      { label: '6th c.', value: 38 },
      { label: '7th c.', value: 44 },
      { label: '8th c.', value: 61 },
      { label: '9th c.', value: 53 },
      { label: '10th c.', value: 70 },
    ],
    materialComposition: [
      { label: 'Ceramic', value: 522 },
      { label: 'Lithic', value: 311 },
      { label: 'Metal', value: 176 },
      { label: 'Organic', value: 98 },
      { label: 'Glass', value: 57 },
    ],
    recentDiscoveries: [
      { id: 'GAH-AR-1042', site: 'Tell Qarah', depthM: 1.4, material: 'Ceramic' },
      { id: 'GAH-AR-1039', site: 'Valley Survey 3', depthM: 0.8, material: 'Lithic' },
      { id: 'GAH-AR-1033', site: 'Harbor Trench A', depthM: 2.2, material: 'Metal' },
      { id: 'GAH-AR-1027', site: 'Tell Qarah', depthM: 1.9, material: 'Organic' },
      { id: 'GAH-AR-1018', site: 'Dune Edge', depthM: 0.5, material: 'Glass' },
    ],
  }

  return (
    <div className="parchment-main min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">Statistics & Analytics</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-ink">Research Overview</h2>
            <p className="text-sm text-ink/70 mt-1 max-w-2xl">
              High-level indicators, distribution patterns, and recent field entries. (Mock dataset; API-ready structure.)
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-ink/20 bg-white/70 backdrop-blur-sm text-sm font-semibold text-ink hover:bg-white/85 shadow-[0_2px_14px_rgba(44,40,37,0.08)]"
              title="Mock export action"
            >
              Export PDF
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-xl border border-ink/20 bg-white/70 backdrop-blur-sm text-sm font-semibold text-ink hover:bg-white/85 shadow-[0_2px_14px_rgba(44,40,37,0.08)]"
              title="Mock export action"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Artifacts Found" value={fmtInt(stats.kpis.totalArtifactsFound)} detail="All sites (public-safe)" />
          <KpiCard label="Active Dig Sites" value={fmtInt(stats.kpis.activeDigSites)} detail="Currently in progress" />
          <KpiCard label="Dated Samples (C14)" value={fmtInt(stats.kpis.datedSamplesC14)} detail="Lab-confirmed" />
          <KpiCard label="Total Team Members" value={fmtInt(stats.kpis.totalTeamMembers)} detail="Researchers & field staff" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/60 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-ink">Temporal Distribution</h3>
              <p className="text-[11px] text-ink/60 font-medium">Artifact frequency by century</p>
            </div>
            <div className="mt-3">
              <BarChart data={stats.temporalDistribution} ariaLabel="Artifact frequency across centuries" />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-ink">Material Composition</h3>
              <p className="text-[11px] text-ink/60 font-medium">Share of finds by material</p>
            </div>
            <div className="mt-3">
              <DoughnutChart data={stats.materialComposition} ariaLabel="Material composition doughnut chart" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white/60 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)] overflow-hidden">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-ink">Recent Discoveries</h3>
              <p className="text-[11px] text-ink/60 font-medium">Latest logged artifacts</p>
            </div>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-[640px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left">
                    {['ID', 'Site', 'Depth', 'Material'].map(h => (
                      <th key={h} className="text-[11px] font-semibold uppercase tracking-wide text-ink/60 border-b border-ink/15 py-2 pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.recentDiscoveries.map((row) => (
                    <tr key={row.id} className="hover:bg-white/40 transition-colors">
                      <td className="py-2 pr-4 text-sm font-semibold text-ink">{row.id}</td>
                      <td className="py-2 pr-4 text-sm text-ink/85">{row.site}</td>
                      <td className="py-2 pr-4 text-sm text-ink/85">{row.depthM.toFixed(1)} m</td>
                      <td className="py-2 pr-4 text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg border border-ink/15 bg-parchment-50 text-ink/80 text-[12px] font-semibold">
                          {row.material}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
              <h3 className="text-sm font-bold text-ink">Dashboard Widgets (Reusable)</h3>
              <p className="text-[11px] text-ink/60 mt-1">
                These are standalone components you can drop into a grid-based dashboard.
              </p>
            </div>

            <SiteProgressWidget
              title="Site Progress"
              siteName="Tell Qarah"
              percentComplete={68}
              subtitle="Trench B"
            />
            <StratigraphicHeatmapWidget
              title="Stratigraphic Heatmap"
              depthBins={[
                { depthLabel: '0–0.5m', density: 0.35 },
                { depthLabel: '0.5–1.0m', density: 0.55 },
                { depthLabel: '1.0–1.5m', density: 0.82 },
                { depthLabel: '1.5–2.0m', density: 0.63 },
                { depthLabel: '2.0–2.5m', density: 0.41 },
              ]}
            />
            <WeatherEnvironmentWidget
              title="Weather / Environment"
              siteLabel="Primary Site"
              coordinates={{ lat: 29.9765, lon: 31.1313 }}
              conditions={{
                summary: 'Dry, light wind',
                temperatureC: 27,
                windKph: 14,
                humidityPct: 31,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

