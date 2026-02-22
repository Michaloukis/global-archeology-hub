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
    <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md border-2 border-black bg-white p-6 sm:p-12 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
        
        <div className="mb-12">
          <h1 className="text-3xl font-black text-black tracking-tighter uppercase leading-none">
            Global Archeology Hub
          </h1>
          <p className="text-[10px] text-gray-400 tracking-[0.3em] mt-3 font-bold uppercase">
            Authentication Module // v2.0.0
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-8">
          {isSignUp && (
            <>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-black uppercase tracking-widest">Full Name</label>
                <input
                  type="text"
                  placeholder="Official Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full min-h-[44px] bg-white border-2 border-black px-4 py-3 text-base text-black focus:bg-gray-50 outline-none transition-all placeholder:text-gray-300 font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-black uppercase tracking-widest">Username</label>
                <input
                  type="text"
                  placeholder="Unique ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full min-h-[44px] bg-white border-2 border-black px-4 py-3 text-base text-black focus:bg-gray-50 outline-none transition-all placeholder:text-gray-300 font-bold"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-black uppercase tracking-widest">Designation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full min-h-[44px] bg-white border-2 border-black px-4 py-3 text-base text-black focus:bg-gray-50 outline-none transition-all cursor-pointer font-bold appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'black\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="Chief Archeologist">Chief Archeologist</option>
                  <option value="Field Archeologist">Field Archeologist</option>
                  <option value="Student">Student</option>
                  <option value="Enthusiast">Enthusiast</option>
                </select>
              </div>
            </>
          )}
          
          <div className="space-y-2">
            <label className="text-[11px] font-black text-black uppercase tracking-widest">Email</label>
            <input
              type="email"
              placeholder="id@institution.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] bg-white border-2 border-black px-4 py-3 text-base text-black focus:bg-gray-50 outline-none transition-all placeholder:text-gray-300 font-bold"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-black uppercase tracking-widest">Security Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] bg-white border-2 border-black px-4 py-3 text-base text-black focus:bg-gray-50 outline-none transition-all placeholder:text-gray-300 font-bold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-black text-white py-4 px-4 text-base font-black uppercase tracking-widest transition-all hover:bg-gray-800 active:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400"
          >
            {loading ? 'WAIT...' : isSignUp ? 'Create Profile' : 'Access Hub'}
          </button>
        </form>

        {message && (
          <div className="mt-8 p-4 border-2 border-black text-[10px] font-black text-center uppercase tracking-widest">
            {message}
          </div>
        )}

        <div className="mt-12 pt-8 border-t-2 border-black text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="min-h-[44px] flex items-center justify-center w-full sm:w-auto text-black hover:underline text-[11px] font-black uppercase tracking-widest transition-all active:opacity-80"
          >
            {isSignUp ? 'Back to Login' : 'Register New Identity'}
          </button>
        </div>
      </div>
    </div>
  )
}
