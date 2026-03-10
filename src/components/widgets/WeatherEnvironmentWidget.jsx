function fmtCoord(n) {
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(4)
}

export default function WeatherEnvironmentWidget({
  title = 'Weather / Environment',
  siteLabel = 'Primary Site',
  coordinates,
  conditions,
}) {
  const lat = coordinates?.lat
  const lon = coordinates?.lon
  const c = conditions || {
    summary: '—',
    temperatureC: null,
    windKph: null,
    humidityPct: null,
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{title}</p>
          <p className="text-sm font-bold text-ink mt-0.5 truncate" title={siteLabel}>{siteLabel}</p>
          <p className="text-[11px] text-ink/60 font-medium mt-0.5">
            {fmtCoord(lat)}, {fmtCoord(lon)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl border border-ink/15 bg-parchment-50 flex items-center justify-center shrink-0" aria-hidden>
          <svg className="w-5 h-5 text-ink/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a4 4 0 100-8 5 5 0 10-9 4" />
          </svg>
        </div>
      </div>

      <div className="mt-3 bg-white/55 border border-ink/15 rounded-xl p-3">
        <p className="text-sm font-semibold text-ink">{c.summary || '—'}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-ink/10 bg-parchment-50/70 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60">Temp</p>
            <p className="text-sm font-black text-ink">{Number.isFinite(c.temperatureC) ? `${c.temperatureC}°C` : '—'}</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-parchment-50/70 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60">Wind</p>
            <p className="text-sm font-black text-ink">{Number.isFinite(c.windKph) ? `${c.windKph} kph` : '—'}</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-parchment-50/70 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60">Humidity</p>
            <p className="text-sm font-black text-ink">{Number.isFinite(c.humidityPct) ? `${c.humidityPct}%` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

