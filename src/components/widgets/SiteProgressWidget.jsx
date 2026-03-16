function clamp01(n) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function statusPill(statusRaw) {
  const s = String(statusRaw || '').trim()
  const low = s.toLowerCase()
  if (!s) return null
  if (low.includes('finish')) return { label: s, cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
  if (low.includes('progress') || low.includes('active')) return { label: s, cls: 'bg-sage/15 text-ink border-sage/30' }
  if (low.includes('planned') || low.includes('pending')) return { label: s, cls: 'bg-amber-50 text-amber-900 border-amber-200' }
  return { label: s, cls: 'bg-parchment-50 text-ink/80 border-ink/15' }
}

export default function SiteProgressWidget({ title = 'Site Progress', siteName, subtitle, percentComplete = 0 }) {
  const pct = clamp01(percentComplete / 100)
  const size = 80
  const stroke = 9
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  const percentLabel = Math.round(pct * 100)

  const statusText = subtitle?.startsWith('Status:') ? subtitle.replace(/^Status:\s*/i, '') : subtitle
  const pill = statusPill(statusText)

  return (
    <div className="relative overflow-hidden h-full bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-3 shadow-[0_2px_14px_rgba(44,40,37,0.08)] flex flex-col gap-2">
      {/* background wash */}
      <div
        className="absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-50 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(107,139,79,0.25), rgba(201,184,150,0) 60%)' }}
        aria-hidden
      />

      {/* header row */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink/55">{title}</p>
        <span className="text-[10px] font-bold text-ink/70 tabular-nums">{percentLabel}%</span>
      </div>

      {/* main content: left text + right ring */}
      <div className="flex items-center gap-3 min-h-0 flex-1">
        {/* left: site info + bar */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-xl border border-ink/15 bg-parchment-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-ink/65" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
              </svg>
            </div>
            <p className="text-sm font-black tracking-tight text-ink truncate leading-tight" title={siteName || ''}>
              {siteName || '—'}
            </p>
          </div>

          {pill && (
            <span className={`self-start text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-lg border ${pill.cls}`}>
              {pill.label}
            </span>
          )}

          <div>
            <p className="text-[9px] text-ink/50 font-medium mb-1">Excavation completion</p>
            <div className="h-2 rounded-full bg-ink/10 border border-ink/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percentLabel}%`,
                  background: 'linear-gradient(90deg, rgba(92,64,51,0.55), rgba(107,139,79,0.95))',
                }}
                role="presentation"
              />
            </div>
            <div className="mt-0.5 flex items-center justify-between text-[9px] font-semibold text-ink/45">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* right: ring */}
        <div className="shrink-0 relative" style={{ width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Excavation completion progress">
            <defs>
              <linearGradient id="siteProgressRing" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(92,64,51,0.85)" />
                <stop offset="55%" stopColor="rgba(107,139,79,0.95)" />
                <stop offset="100%" stopColor="rgba(201,184,150,0.9)" />
              </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(44,40,37,0.12)" strokeWidth={stroke} fill="transparent" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="url(#siteProgressRing)"
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
              <p className="text-lg font-black text-ink leading-none tabular-nums">{percentLabel}</p>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-ink/55 mt-0.5">done</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
