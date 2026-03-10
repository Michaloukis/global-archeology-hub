import React, { useMemo, useState } from 'react'

const PERMISSIONS = [
  { key: 'canEditArtifacts', label: 'Can edit artifacts' },
  { key: 'canPostReports', label: 'Can post reports' },
  { key: 'canManageTasks', label: 'Can manage tasks' },
  { key: 'canModerateMessages', label: 'Can moderate messages' },
]

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-4 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
        checked ? 'border-ink/25 bg-parchment-200/60 text-ink' : 'border-ink/10 bg-white/70 text-ink/80 hover:bg-white'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span
        className={`w-10 h-6 rounded-full border flex items-center px-1 transition-all ${
          checked ? 'bg-ink border-ink justify-end' : 'bg-white border-ink/20 justify-start'
        }`}
        aria-hidden
      >
        <span className="w-4 h-4 rounded-full bg-white shadow" />
      </span>
    </button>
  )
}

export default function RoleManager({ team, members, value, onChange }) {
  const initial = useMemo(
    () =>
      value || {
        roles: [
          { id: 'director', name: 'Director', system: true, permissions: Object.fromEntries(PERMISSIONS.map((p) => [p.key, true])) },
          { id: 'field', name: 'Field Archaeologist', system: true, permissions: { canEditArtifacts: true, canPostReports: true, canManageTasks: false, canModerateMessages: false } },
          { id: 'finds', name: 'Finds Assistant', system: false, permissions: { canEditArtifacts: true, canPostReports: false, canManageTasks: false, canModerateMessages: false } },
        ],
        tasks: [
          { id: 't1', title: 'Daily locus notes (Unit A)', assigneeType: 'role', assigneeId: 'field' },
          { id: 't2', title: 'Bag & label ceramics batch 3', assigneeType: 'role', assigneeId: 'finds' },
        ],
      },
    [value],
  )

  const [state, setState] = useState(initial)
  const [newRoleName, setNewRoleName] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskAssigneeType, setNewTaskAssigneeType] = useState('role')
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('field')

  const commit = (next) => {
    setState(next)
    onChange?.(next)
  }

  const addRole = () => {
    const name = newRoleName.trim()
    if (!name) return
    const id = `custom_${Date.now()}`
    commit({
      ...state,
      roles: [
        ...state.roles,
        { id, name, system: false, permissions: Object.fromEntries(PERMISSIONS.map((p) => [p.key, false])) },
      ],
    })
    setNewRoleName('')
  }

  const updateRolePermission = (roleId, permKey, nextVal) => {
    commit({
      ...state,
      roles: state.roles.map((r) =>
        r.id === roleId ? { ...r, permissions: { ...r.permissions, [permKey]: nextVal } } : r,
      ),
    })
  }

  const removeRole = (roleId) => {
    const role = state.roles.find((r) => r.id === roleId)
    if (!role || role.system) return
    commit({
      ...state,
      roles: state.roles.filter((r) => r.id !== roleId),
      tasks: state.tasks.map((t) =>
        t.assigneeType === 'role' && t.assigneeId === roleId ? { ...t, assigneeId: 'field' } : t,
      ),
    })
  }

  const addTask = () => {
    const title = newTaskTitle.trim()
    if (!title) return
    commit({
      ...state,
      tasks: [
        { id: `task_${Date.now()}`, title, assigneeType: newTaskAssigneeType, assigneeId: newTaskAssigneeId },
        ...state.tasks,
      ],
    })
    setNewTaskTitle('')
  }

  const assigneeLabel = (task) => {
    if (task.assigneeType === 'member') {
      const m = members?.find((x) => x.id === task.assigneeId)
      return m ? m.name : 'Member'
    }
    const r = state.roles.find((x) => x.id === task.assigneeId)
    return r ? r.name : 'Role'
  }

  const roleOptions = state.roles.map((r) => ({ id: r.id, name: r.name }))
  const memberOptions = (members || []).map((m) => ({ id: m.id, name: m.name }))

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-ink">Settings · Roles</h3>
        <p className="text-xs text-ink/60 mt-1">
          Create custom roles, toggle permissions, and assign tasks to roles or individual team members.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-ink">Create custom role</label>
              <input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder='e.g., "Trench Supervisor"'
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
              />
            </div>
            <button
              type="button"
              onClick={addRole}
              className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-ink/90"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {state.roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-ink/10 bg-parchment-100/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{role.name}</p>
                    <p className="text-[11px] text-ink/55">{role.system ? 'System role' : `Custom role · ${team?.name || 'Team'}`}</p>
                  </div>
                  {!role.system ? (
                    <button
                      type="button"
                      onClick={() => removeRole(role.id)}
                      className="text-xs font-semibold text-ink/70 hover:text-ink rounded-lg px-2 py-1 hover:bg-white/60"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => (
                    <Toggle
                      key={p.key}
                      label={p.label}
                      checked={!!role.permissions?.[p.key]}
                      onChange={(next) => updateRolePermission(role.id, p.key, next)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
          <h4 className="text-sm font-bold text-ink">Task assignment</h4>
          <p className="text-xs text-ink/60 mt-1">Assign tasks to a role (coverage) or a person (accountability).</p>

          <div className="mt-3 rounded-2xl border border-ink/10 bg-parchment-100/40 p-3">
            <label className="text-xs font-semibold text-ink">New task</label>
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g., Record context photos for Trench 2"
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
            />

            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newTaskAssigneeType}
                onChange={(e) => {
                  const nextType = e.target.value
                  setNewTaskAssigneeType(nextType)
                  setNewTaskAssigneeId(nextType === 'member' ? (memberOptions[0]?.id || '') : (roleOptions[0]?.id || 'field'))
                }}
                className="rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
              >
                <option value="role">Assign to role</option>
                <option value="member">Assign to member</option>
              </select>

              <select
                value={newTaskAssigneeId}
                onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                className="sm:col-span-2 rounded-xl border border-ink/15 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20"
              >
                {(newTaskAssigneeType === 'member' ? memberOptions : roleOptions).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={addTask}
                className="rounded-xl border border-ink/20 bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:bg-ink/90"
              >
                Add task
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {state.tasks.map((t) => (
              <div key={t.id} className="rounded-2xl border border-ink/10 bg-white/70 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink leading-snug">{t.title}</p>
                  <p className="text-[11px] text-ink/55 mt-0.5">
                    Assigned to <span className="font-semibold text-ink/80">{assigneeLabel(t)}</span>
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-ink/70 bg-parchment-200/60 border border-ink/10 px-2 py-1 rounded-full shrink-0">
                  {t.assigneeType === 'member' ? 'Member' : 'Role'}
                </span>
              </div>
            ))}
            {state.tasks.length === 0 ? <p className="text-xs text-ink/60">No tasks yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}

