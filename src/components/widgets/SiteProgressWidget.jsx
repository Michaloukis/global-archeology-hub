function clamp01(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export default function SiteProgressWidget({ title = 'Site Progress', siteName, subtitle, percentComplete = 0 }) {
  const pct = clamp01(percentComplete / 100)
  const size = 96
  const stroke = 10
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)

  return (
    <div className="bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{title}</p>
          <p className="text-sm font-bold text-ink mt-0.5 truncate" title={siteName || ''}>{siteName || '—'}</p>
          {subtitle ? <p className="text-[11px] text-ink/60 font-medium mt-0.5">{subtitle}</p> : null}
        </div>
        <span className="text-[11px] font-semibold text-ink/70 shrink-0">{Math.round(pct * 100)}%</span>
      </div>

      <div className="mt-3 flex items-center justify-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" role="img" aria-label="Excavation completion progress">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(44,40,37,0.12)" strokeWidth={stroke} fill="transparent" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="rgba(107,139,79,0.95)"
              strokeWidth={stroke}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl font-black text-ink leading-none">{Math.round(pct * 100)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/60 -mt-0.5">complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

