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
  const size = 120
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - pct)
  const percentLabel = Math.round(pct * 100)

  const statusText = subtitle?.startsWith('Status:') ? subtitle.replace(/^Status:\s*/i, '') : subtitle
  const pill = statusPill(statusText)

  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-ink/20 rounded-2xl p-4 shadow-[0_2px_14px_rgba(44,40,37,0.08)]">
      {/* subtle museum-modern wash */}
      <div
        className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(107,139,79,0.25), rgba(201,184,150,0) 60%)' }}
        aria-hidden
      />
      <div
        className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-60"
        style={{ background: 'radial-gradient(circle at 30% 30%, rgba(92,64,51,0.18), rgba(201,184,150,0) 60%)' }}
        aria-hidden
      />

      <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/60">{title}</p>
            <span className="text-[11px] font-semibold text-ink/70 shrink-0 tabular-nums">{percentLabel}%</span>
          </div>

          <div className="mt-2 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl border border-ink/15 bg-parchment-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-ink/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21s7-4.438 7-11a7 7 0 10-14 0c0 6.562 7 11 7 11z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-base font-black tracking-tight text-ink truncate" title={siteName || ''}>
                {siteName || '—'}
              </p>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {pill ? (
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-xl border ${pill.cls}`}>
                    {pill.label}
                  </span>
                ) : null}
                <span className="text-[11px] text-ink/55 font-medium">Excavation completion</span>
              </div>

              <div className="mt-3">
                <div className="h-2.5 rounded-full bg-ink/10 border border-ink/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percentLabel}%`,
                      background: 'linear-gradient(90deg, rgba(92,64,51,0.55), rgba(107,139,79,0.95))',
                    }}
                    role="presentation"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-ink/55">
                  <span className="uppercase tracking-wide">0%</span>
                  <span className="uppercase tracking-wide">100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end">
          <div className="relative" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" role="img" aria-label="Excavation completion progress">
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
                <p className="text-2xl font-black text-ink leading-none tabular-nums">{percentLabel}</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/60 mt-0.5">complete</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

