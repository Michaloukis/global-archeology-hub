import React, { useMemo, useState } from 'react'

function Field({ label, required, children, hint }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-semibold text-ink">
          {label} {required ? <span className="text-amber-700">*</span> : null}
        </span>
        {hint ? <span className="text-[11px] text-ink/50">{hint}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function InviteForm({ teamName, initialValues, onSubmit, onCancel }) {
  const defaults = useMemo(
    () => ({
      targetUser: initialValues?.targetUser || '',
      proposedRole: initialValues?.proposedRole || 'Field Archaeologist',
      expectations: initialValues?.expectations || '',
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
        <h3 className="text-base font-bold text-ink">Invite an archaeologist</h3>
        <p className="text-xs text-ink/60 mt-1">
          Director-initiated invitations to {teamName || 'your team'}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Target User Email / ID" required hint="Required">
          <input
            required
            value={values.targetUser}
            onChange={update('targetUser')}
            placeholder="email@domain.com or user-id"
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
          />
        </Field>

        <Field label="Proposed Role" required hint="Required">
          <select
            required
            value={values.proposedRole}
            onChange={update('proposedRole')}
            className="w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
          >
            <option>Field Archaeologist</option>
            <option>Trench Supervisor</option>
            <option>Finds Assistant</option>
            <option>Bioarchaeologist</option>
          </select>
        </Field>
      </div>

      <Field label="Role Expectations & Project Goals" required hint="Required">
        <textarea
          required
          value={values.expectations}
          onChange={update('expectations')}
          placeholder="Scope of work, reporting cadence, data standards, safety, deliverables, timeline…"
          rows={7}
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
          {submitted ? 'Invite sent' : 'Send Invite'}
        </button>
      </div>
    </form>
  )
}

