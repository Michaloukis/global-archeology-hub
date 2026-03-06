import { useState } from 'react'
import { supabase } from '../supabaseClient'

// #region agent log
const logData = (msg, data, hypothesisId) => {
  fetch('http://127.0.0.1:7243/ingest/681b1f5c-17b9-4cf5-8463-2a620377b7c6',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({location:'Auth.jsx',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId})
  }).catch(()=>{});
};
// #endregion

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('Enthusiast')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    if (!supabase) {
      alert('SYSTEM ERROR: Database connection lost.')
      setLoading(false)
      return
    }

    try {
      if (isSignUp) {
        logData('SignUp attempt', { email, fullName, username, role }, 'A');
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              username: username,
              role: role,
            }
          }
        })
        if (authError) {
          logData('SignUp error', { authError }, 'A');
          throw authError
        }

        logData('SignUp success', { userId: authData?.user?.id, metadata: authData?.user?.user_metadata }, 'A');

        // BACKUP: Direct insert in case trigger fails
        if (authData?.user) {
          logData('Backup insert start', { userId: authData.user.id, username }, 'B');
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: authData.user.id, 
                full_name: fullName, 
                username: username,
                role: role,
                updated_at: new Date()
              }
            ])
          if (insertError) {
            logData('Backup insert error', { insertError }, 'B');
            console.error('DEBUG: Backup insert failed:', insertError);
          } else {
            logData('Backup insert success', {}, 'B');
            console.log('DEBUG: Backup insert success');
          }
        }
        
        setMessage('REGISTRATION COMPLETE. IDENTITY VERIFIED.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          throw error
        }
      }
    } catch (error) {
      setMessage(`ERROR: ${error.message.toUpperCase()}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen h-full flex items-center justify-center parchment-main p-4 sm:p-6 font-sans text-ink"
      style={{ minHeight: '100dvh', paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-ink/20 rounded-[2rem] shadow-[4px_4px_16px_rgba(44,40,37,0.12)] p-6 sm:p-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-yellow-400 tracking-tighter uppercase leading-none">
            Global Archaeology Hub
          </h1>
          <p className="text-[10px] text-ink/60 tracking-widest mt-2 font-bold uppercase">
            Authentication · v2.0
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-ink uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  placeholder="Official Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 border border-ink/30 rounded-lg px-4 py-3 text-ink placeholder-ink/50 outline-none focus:border-ink transition-colors font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-ink uppercase tracking-widest">Username</label>
                <input
                  type="text"
                  placeholder="Unique ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 border border-ink/30 rounded-lg px-4 py-3 text-ink placeholder-ink/50 outline-none focus:border-ink transition-colors font-medium"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-ink uppercase tracking-widest">Designation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full min-h-[44px] bg-white/80 border border-ink/30 rounded-lg px-4 py-3 text-ink outline-none focus:border-ink transition-colors font-medium cursor-pointer appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%232c2825\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="Director">Director</option>
                  <option value="Field Archeologist">Field Archeologist</option>
                  <option value="Student">Student</option>
                  <option value="Enthusiast">Enthusiast</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ink uppercase tracking-widest">Email</label>
            <input
              type="email"
              placeholder="id@institution.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] bg-white/80 border border-ink/30 rounded-lg px-4 py-3 text-ink placeholder-ink/50 outline-none focus:border-ink transition-colors font-medium"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-ink uppercase tracking-widest">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] bg-white/80 border border-ink/30 rounded-lg px-4 py-3 text-ink placeholder-ink/50 outline-none focus:border-ink transition-colors font-medium"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-ink text-white py-3 px-4 rounded-lg text-sm font-black uppercase tracking-widest transition-all hover:opacity-90 active:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
          >
            {loading ? 'Wait…' : isSignUp ? 'Create Profile' : 'Access Hub'}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-3 rounded-lg border border-ink/20 bg-white/60 text-[10px] font-bold text-ink text-center uppercase tracking-widest">
            {message}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-ink/20 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="min-h-[44px] flex items-center justify-center w-full sm:w-auto text-ink hover:text-ink/80 text-[10px] font-black uppercase tracking-widest transition-colors touch-target"
          >
            {isSignUp ? 'Back to Login' : 'Register New Identity'}
          </button>
        </div>
      </div>
    </div>
  )
}
