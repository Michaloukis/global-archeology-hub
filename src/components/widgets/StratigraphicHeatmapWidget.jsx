function clamp01(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function heatColor(t) {
  // Museum-modern: stone→clay→sage ramp (muted)
  const x = clamp01(t)
  if (x < 0.5) {
    // ink-ish to clay
    const k = x / 0.5
    return `rgba(${Math.round(44 + (92 - 44) * k)},${Math.round(40 + (64 - 40) * k)},${Math.round(37 + (51 - 37) * k)},${0.28 + 0.32 * k})`
  }
  const k = (x - 0.5) / 0.5
  return `rgba(${Math.round(92 + (107 - 92) * k)},${Math.round(64 + (139 - 64) * k)},${Math.round(51 + (79 - 51) * k)},${0.6 + 0.25 * k})`
}

export default function StratigraphicHeatmapWidget({
  title = 'Stratigraphic Heatmap',
  depthBins = [],
  subtitle = 'Find density vs depth (Z-axis)',
}) {
  const rows = depthBins.length > 0 ? depthBins : [
    { depthLabel: '0–0.5m', density: 0.25 },
    { depthLabel: '0.5–1.0m', density: 0.52 },
    { depthLabel: '1.0–1.5m', density: 0.78 },
    { depthLabel: '1.5–2.0m', density: 0.43 },
  ]

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{title}</p>
          <p className="text-[11px] text-ink/60 font-medium mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink/60">
          <span className="w-10 h-2 rounded-full border border-ink/15" style={{ background: 'linear-gradient(90deg, rgba(44,40,37,0.25), rgba(92,64,51,0.55), rgba(107,139,79,0.85))' }} aria-hidden />
          low→high
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        {rows.map((r) => (
          <div key={r.depthLabel} className="flex items-center gap-3">
            <div className="w-20 shrink-0 text-[11px] font-semibold text-ink/70">{r.depthLabel}</div>
            <div className="flex-1 h-3 rounded-full border border-ink/15 bg-white/40 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round(clamp01(r.density) * 100)}%`,
                  background: heatColor(r.density),
                }}
                role="presentation"
              />
            </div>
            <div className="w-10 shrink-0 text-right text-[11px] font-semibold text-ink/60">
              {Math.round(clamp01(r.density) * 100)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

