import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AVATAR_BUCKET = 'avatars'
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp'
const TABS = [{ key: 'profile', label: 'Profile' }, { key: 'settings', label: 'Settings' }]

export default function AccountPage({ profile, session, onProfileUpdate, onLogout, onRestoreDefaultLayout, isMobile }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '')
  const [isEditing, setIsEditing] = useState(false)
  const [profileVisibility, setProfileVisibility] = useState(profile?.profile_visibility ?? 'team')
  const [showEmail, setShowEmail] = useState(profile?.show_email ?? false)
  const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications !== false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    setUsername(profile?.username ?? '')
    setFullName(profile?.full_name ?? '')
    setAvatarUrl(profile?.avatar_url ?? '')
    setProfileVisibility(profile?.profile_visibility ?? 'team')
    setShowEmail(profile?.show_email ?? false)
    setEmailNotifications(profile?.email_notifications !== false)
  }, [profile?.id, profile?.username, profile?.full_name, profile?.avatar_url, profile?.profile_visibility, profile?.show_email, profile?.email_notifications])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const avatarInputRef = useRef(null)

  const email = session?.user?.email ?? ''

  const handleSave = async () => {
    if (!supabase || !profile?.id) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      let newAvatarUrl = avatarUrl
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${profile.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true })
        if (uploadError) throw uploadError
        const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
        newAvatarUrl = publicUrl
        setAvatarUrl(newAvatarUrl)
        setAvatarFile(null)
      }
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim() || null,
          full_name: fullName.trim() || null,
          ...(newAvatarUrl !== undefined && { avatar_url: newAvatarUrl || null }),
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
      if (error) throw error
      onProfileUpdate?.({ ...profile, username: username.trim(), full_name: fullName.trim(), avatar_url: newAvatarUrl })
      setMessage({ type: 'success', text: 'Settings saved.' })
      setIsEditing(false)
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
    }
  }

  const handleSaveSettings = async () => {
    if (!supabase || !profile?.id) return
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          profile_visibility: profileVisibility,
          show_email: showEmail,
          email_notifications: emailNotifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
      if (error) throw error
      onProfileUpdate?.({ ...profile, profile_visibility: profileVisibility, show_email: showEmail, email_notifications: emailNotifications })
      setMessage({ type: 'success', text: 'Settings saved.' })
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || 'Failed to save.' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordMessage({ type: '', text: '' })
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    if (!supabase) return
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordMessage({ type: 'success', text: 'Password updated. Use it next time you sign in.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setPasswordMessage({ type: 'error', text: e?.message || 'Failed to update password.' })
    }
  }

  const padding = isMobile ? 'p-4' : 'p-6'
  return (
    <div className={`parchment-main min-h-full ${padding}`}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between border-b border-ink/20 pb-2 mb-4">
          <h1 className="text-xl font-bold text-ink">Account</h1>
          {activeTab === 'profile' && (
          <button
            type="button"
            onClick={() => { setIsEditing((e) => !e); setMessage({ type: '', text: '' }); if (isEditing) { setUsername(profile?.username ?? ''); setFullName(profile?.full_name ?? ''); setAvatarUrl(profile?.avatar_url ?? ''); setAvatarFile(null); } }}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-ink/30 text-ink hover:bg-ink/10"
          >
            {isEditing ? 'Cancel' : 'Edit profile'}
          </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-ink/20">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setActiveTab(key); setMessage({ type: '', text: '' }); setPasswordMessage({ type: '', text: '' }); }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${activeTab === key ? 'border-ink text-ink bg-ink/5' : 'border-transparent text-ink/60 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'profile' && (
        <>
        {/* Profile pic: clickable only in edit mode */}
        <div className="flex flex-col items-center mb-6">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="relative rounded-full overflow-hidden border-2 border-ink/30 bg-white/80 w-24 h-24 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ink/40"
                aria-label="Change profile picture"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-10 h-10 text-ink/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>
              <input ref={avatarInputRef} type="file" accept={AVATAR_ACCEPT} onChange={handleAvatarChange} className="hidden" />
              <span className="text-xs text-ink/60 mt-1">Tap to change photo</span>
            </>
          ) : (
            <div className="rounded-full overflow-hidden border-2 border-ink/20 bg-white/80 w-24 h-24 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-10 h-10 text-ink/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Email (always read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Email</label>
          <div className="px-3 py-2 border border-ink/20 rounded-lg bg-ink/5 text-sm text-ink">{email || '—'}</div>
          <p className="text-[10px] text-ink/50 mt-0.5">Email is managed by sign-in.</p>
        </div>

        {/* Full name: editable only when isEditing */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Full name</label>
          {isEditing ? (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-ink/30 rounded-lg bg-white/80 text-ink text-sm outline-none focus:border-ink/50"
            />
          ) : (
            <div className="px-3 py-2 border border-ink/20 rounded-lg bg-ink/5 text-sm text-ink">{fullName || '—'}</div>
          )}
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Username</label>
          {isEditing ? (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full px-3 py-2 border border-ink/30 rounded-lg bg-white/80 text-ink text-sm outline-none focus:border-ink/50"
            />
          ) : (
            <div className="px-3 py-2 border border-ink/20 rounded-lg bg-ink/5 text-sm text-ink">{username || '—'}</div>
          )}
        </div>

        {/* Role (read-only) */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Role</label>
          <div className="px-3 py-2 border border-ink/20 rounded-lg bg-ink/5 text-sm text-ink">{profile?.role ?? '—'}</div>
        </div>

        {message.text && (
          <p className={`text-sm mb-4 ${message.type === 'error' ? 'text-red-600' : 'text-ink/80'}`}>{message.text}</p>
        )}

        <div className="flex flex-col gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 bg-ink text-white text-sm font-bold rounded-lg hover:bg-ink/90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </div>
        </>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">Privacy</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Profile visibility</label>
                  <select
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                    className="w-full px-3 py-2 border border-ink/30 rounded-lg bg-white/80 text-ink text-sm outline-none focus:border-ink/50"
                  >
                    <option value="public">Public — visible to everyone</option>
                    <option value="team">Team — visible to logged-in hub users</option>
                    <option value="private">Private — only you</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showEmail} onChange={(e) => setShowEmail(e.target.checked)} className="rounded border-ink/40 text-ink" />
                  <span className="text-sm text-ink">Show email to team members</span>
                </label>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">Notifications</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={emailNotifications} onChange={(e) => setEmailNotifications(e.target.checked)} className="rounded border-ink/40 text-ink" />
                <span className="text-sm text-ink">Email notifications (updates, dig requests, etc.)</span>
              </label>
            </section>

            {message.text && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-ink/80'}`}>{message.text}</p>
            )}
            <button type="button" onClick={handleSaveSettings} disabled={saving} className="px-4 py-2.5 bg-ink text-white text-sm font-bold rounded-lg hover:bg-ink/90 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save settings'}
            </button>

            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">Change password</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 border border-ink/30 rounded-lg bg-white/80 text-ink text-sm outline-none focus:border-ink/50"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink/70 uppercase tracking-wide mb-1">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    className="w-full px-3 py-2 border border-ink/30 rounded-lg bg-white/80 text-ink text-sm outline-none focus:border-ink/50"
                    autoComplete="new-password"
                  />
                </div>
                {passwordMessage.text && (
                  <p className={`text-sm ${passwordMessage.type === 'error' ? 'text-red-600' : 'text-ink/80'}`}>{passwordMessage.text}</p>
                )}
                <button type="button" onClick={handleChangePassword} className="px-4 py-2.5 border border-ink/30 text-ink text-sm font-medium rounded-lg hover:bg-ink/10">
                  Update password
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">App preferences</h2>
              <p className="text-sm text-ink/70 mb-2">Reset your home dashboard to the default widgets and layout.</p>
              {onRestoreDefaultLayout ? (
                <button type="button" onClick={onRestoreDefaultLayout} className="px-4 py-2.5 border border-ink/30 text-ink text-sm font-medium rounded-lg hover:bg-ink/10">
                  Restore default dashboard layout
                </button>
              ) : (
                <p className="text-xs text-ink/50">Go to Home and open “Add widgets” to restore default layout.</p>
              )}
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">Session & security</h2>
              <p className="text-sm text-ink/70 mb-2">Sign out of this device. You can sign back in with the same account.</p>
              <button type="button" onClick={onLogout} className="px-4 py-2.5 border border-ink/30 text-ink text-sm font-medium rounded-lg hover:bg-ink/10">
                Sign out of this device
              </button>
            </section>

            <section>
              <h2 className="text-sm font-bold text-ink/80 uppercase tracking-wide mb-3">Data & export</h2>
              <p className="text-sm text-ink/70 mb-2">Download a copy of your account and hub data.</p>
              <button type="button" disabled className="px-4 py-2.5 border border-ink/20 text-ink/50 text-sm font-medium rounded-lg cursor-not-allowed">
                Export my data (coming soon)
              </button>
            </section>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-ink/20">
          <button type="button" onClick={onLogout} className="px-4 py-2.5 border border-ink/30 text-ink text-sm font-medium rounded-lg hover:bg-ink/10">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
