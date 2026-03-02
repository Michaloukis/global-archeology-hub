import { useState, useRef, useEffect } from 'react'
import { chatWithGroq } from '../services/groqApi'

function buildSystemPrompt(role) {
  const base = `You are the AI assistant for the Global Archaeology Hub. You help users with archaeology-related questions, fieldwork, research, and education. Be concise, professional, and accurate.`
  const roleHint = {
    'Chief Archeologist': 'The user is a Chief Archeologist: help with site oversight, team coordination, approvals, reports, and high-level strategy.',
    'Field Archeologist': 'The user is a Field Archeologist: help with fieldwork, documentation, stratigraphy, finds, journals, and expedition logistics.',
    'Student': 'The user is a Student: help with learning, terminology, methods, and understanding declassified field records and the Student Map.'
  }
  const hint = roleHint[role] || 'Adapt your tone to the user\'s questions.'
  return `${base} ${hint}`
}

export default function AIAssistant({ profile, embedded = false, open: controlledOpen, onClose }) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const role = profile?.role || 'Enthusiast'

  const open = embedded ? controlledOpen : internalOpen
  const setOpen = embedded ? (v) => { if (!v) onClose?.() } : setInternalOpen

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => { scrollToBottom() }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const reply = await chatWithGroq({
        systemPrompt: buildSystemPrompt(role),
        messages: history
      })
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e?.message || 'Request failed')
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e?.message || 'Request failed'}. Check that VITE_GROQ_API_KEY is set in .env.` }])
    } finally {
      setLoading(false)
    }
  }

  const hasKey = !!import.meta.env.VITE_GROQ_API_KEY

  const panelContent = (
    <>
      {!embedded && (
        <div className="p-3 border-b-2 border-black bg-gray-100 flex justify-between items-center min-h-[44px]">
          <span className="text-[10px] font-black uppercase tracking-widest">Hub Assistant · {role}</span>
          <button type="button" onClick={() => setOpen(false)} className="text-black font-black text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1">×</button>
        </div>
      )}
          {!hasKey && (
            <div className="p-3 bg-amber-100 border-b border-black text-[10px] font-bold uppercase">
              Set VITE_GROQ_API_KEY in .env to enable the assistant.
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-xs text-gray-500 font-bold uppercase">Ask about fieldwork, sites, methods, or your role. No key = no replies.</p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs ${m.role === 'user' ? 'text-right' : 'text-left'}`}
              >
                <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">
                  {m.role === 'user' ? 'You' : 'Assistant'}
                </span>
                <div className={`inline-block p-2 rounded border ${m.role === 'user' ? 'bg-black text-white border-black' : 'bg-gray-100 border-gray-300'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-gray-400">Assistant</span>
                <div className="inline-block p-2 bg-gray-100 border border-gray-300 rounded animate-pulse">Thinking…</div>
              </div>
            )}
            {error && <p className="text-[10px] text-red-600 font-bold uppercase">{error}</p>}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 border-t-2 border-black flex gap-2 items-center" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask the Hub..."
              className="flex-1 min-h-[44px] px-3 py-3 border-2 border-black text-sm font-bold uppercase outline-none"
              disabled={!hasKey || loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!hasKey || loading || !input.trim()}
              className="min-h-[44px] px-4 py-3 bg-black text-white text-[10px] font-black uppercase border-2 border-black disabled:opacity-50 disabled:cursor-not-allowed touch-target"
            >
              Send
            </button>
          </div>
    </>
  )

  if (embedded) {
    if (!open) return null
    return (
      <div className="flex flex-col min-h-[280px] max-h-[60vh]">
        <div className="p-2 border-b border-black/20 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-gray-600">Hub Assistant · {role}</span>
          {onClose && <button type="button" onClick={onClose} className="text-black font-bold text-lg leading-none min-h-[36px] min-w-[36px] flex items-center justify-center">×</button>}
        </div>
        {panelContent}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setInternalOpen(!internalOpen)}
        className="fixed z-50 w-16 h-16 sm:w-14 sm:h-14 rounded-full bg-black text-white font-black text-lg shadow-lg border-2 border-gray-800 hover:bg-gray-800 active:bg-gray-700 transition-colors touch-target"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))', left: 'max(1rem, env(safe-area-inset-left))', right: 'auto' }}
        title="AI Assistant"
        aria-label="Toggle AI Assistant"
      >
        AI
      </button>

      {open && (
        <div
          className="fixed z-50 left-0 right-0 sm:left-auto sm:right-6 w-full sm:max-w-md border-4 border-black bg-white shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[75vh]"
          style={{ bottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom)))' }}
        >
          <div className="p-3 border-b-2 border-black bg-gray-100 flex justify-between items-center min-h-[44px]">
            <span className="text-[10px] font-black uppercase tracking-widest">Hub Assistant · {role}</span>
            <button type="button" onClick={() => setInternalOpen(false)} className="text-black font-black text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1">×</button>
          </div>
          {panelContent}
        </div>
      )}
    </>
  )
}
