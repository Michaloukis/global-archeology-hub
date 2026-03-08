export default function TeamPage({ profile, onBack }) {
  return (
    <div className="relative parchment-main min-h-full p-6 md:p-8 flex flex-col items-center justify-start">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-xl font-bold text-ink border-b border-ink/20 pb-2">Team</h1>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-ink/20 text-ink px-4 py-2.5 text-sm font-medium hover:bg-ink/5 min-h-[44px] shrink-0"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-6">
          <ul className="space-y-4">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-ink/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <p className="text-base font-medium text-ink">User {i}</p>
                  <p className="text-sm text-ink/50">Secondary text</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
