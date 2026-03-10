import React from 'react'

export default function TeamCard({ team, onClick }) {
  const sites = team?.activeDigSites ?? 0
  const members = team?.memberCount ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left w-full aspect-square rounded-2xl bg-white/70 backdrop-blur-sm border border-ink/15 shadow-[0_2px_18px_rgba(44,40,37,0.06)] hover:bg-white/85 hover:border-ink/25 hover:shadow-[0_6px_26px_rgba(44,40,37,0.10)] transition-all p-5 flex flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base md:text-lg font-semibold text-ink leading-snug truncate">
            {team?.name || 'Untitled Team'}
          </h3>
          <p className="text-[11px] md:text-xs text-ink/60 mt-1 line-clamp-2">
            {team?.tagline || 'Field operations, documentation, and lab coordination.'}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-ink/70 bg-parchment-200/60 border border-ink/10 px-2 py-1 rounded-full">
          {team?.visibility || 'Active'}
        </span>
      </div>

      <div className="flex-1" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
          <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Active Dig Sites</p>
          <p className="text-lg md:text-xl font-bold text-ink mt-1 leading-none">{sites}</p>
        </div>
        <div className="rounded-xl border border-ink/10 bg-parchment-100/40 p-3">
          <p className="text-[10px] font-semibold text-ink/60 uppercase tracking-wide">Members</p>
          <p className="text-lg md:text-xl font-bold text-ink mt-1 leading-none">{members}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-ink/70">
        <span className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-600/80" aria-hidden />
          {team?.region || 'Unspecified region'}
        </span>
        <span className="font-medium group-hover:text-ink">Open →</span>
      </div>
    </button>
  )
}

