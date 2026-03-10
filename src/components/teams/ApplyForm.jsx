import React, { useMemo, useState } from 'react'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink">{label}</span>
        {hint ? <span className="text-[11px] text-ink/50">{hint}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function ApplyForm({ teamName, initialValues, onSubmit, onCancel }) {
  const defaults = useMemo(
    () => ({
      fullName: initialValues?.fullName || '',
      email: initialValues?.email || '',
      affiliation: initialValues?.affiliation || '',
      experience: initialValues?.experience || '',
      coverLetter: initialValues?.coverLetter || '',
    }),
    [initialValues],
  )

  const [values, setValues] = useState(defaults)
  const [submitted, setSubmitted] = useState(false)

  const update = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    onSubmit?.(values)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-ink">Apply to {teamName || 'Team'}</h3>
        <p className="text-xs text-ink/60 mt-1">
          Share your background so the Director can evaluate fit and assign responsibilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="User Information" hint="Required">
          <div className="grid grid-cols-1 gap-2">
            <input
              required
              value={values.fullName}
              onChange={update('fullName')}
              placeholder="Full name"
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
            />
            <input
              required
              type="email"
              value={values.email}
              onChange={update('email')}
              placeholder="Email"
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
            />
            <input
              value={values.affiliation}
              onChange={update('affiliation')}
              placeholder="Affiliation (museum, university, institute)"
              className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
            />
          </div>
        </Field>

        <Field label="Past Excavation Experience" hint="Required">
          <textarea
            required
            value={values.experience}
            onChange={update('experience')}
            placeholder="Sites, years, methods (stratigraphy, survey, GIS), lab experience…"
            rows={6}
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20 resize-none"
          />
        </Field>
      </div>

      <Field label="Biography / Cover Letter" hint="Required">
        <textarea
          required
          value={values.coverLetter}
          onChange={update('coverLetter')}
          placeholder="Why this project? What can you contribute? Availability + preferred role…"
          rows={6}
          className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20 resize-none"
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-ink/15 bg-white/70 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-ink/90"
        >
          {submitted ? 'Submitted' : 'Submit Application'}
        </button>
      </div>
    </form>
  )
}

