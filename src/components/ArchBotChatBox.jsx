import { useState, useRef, useEffect } from 'react'
import { chatWithGroq } from '../services/groqApi'

function buildSystemPrompt(role) {
  const base = `You are ArchBot, the AI assistant for the Global Archaeology Hub. You help users with archaeology-related questions, fieldwork, research, and education. Be concise, professional, and accurate.`
  const roleHint = {
    'Chief Archeologist': 'The user is a Chief Archeologist: help with site oversight, team coordination, approvals, reports, and high-level strategy.',
    'Field Archeologist': 'The user is a Field Archeologist: help with fieldwork, documentation, stratigraphy, finds, journals, and expedition logistics.',
    'Student': 'The user is a Student: help with learning, terminology, methods, and understanding declassified field records and the Student Map.'
  }
  const hint = roleHint[role] || 'Adapt your tone to the user\'s questions.'
  return `${base} ${hint}`
}

export default function ArchBotChatBox({ profile }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const role = profile?.role || 'Enthusiast'

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
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e?.message || 'Request failed'}. Set VITE_GROQ_API_KEY in .env.` }])
    } finally {
      setLoading(false)
    }
  }

  const hasKey = !!import.meta.env.VITE_GROQ_API_KEY

  return (
    <div className="flex flex-col h-full min-h-[180px] bg-white/50 backdrop-blur-sm border border-ink/40 rounded-lg overflow-hidden">
      <div className="p-1.5 border-b border-ink/20 bg-white/60 shrink-0">
        <h3 className="text-[10px] font-black uppercase tracking-tight text-ink">ArchBot</h3>
        <p className="text-[8px] font-bold text-ink/60 uppercase">Hub AI · {role}</p>
      </div>
      {!hasKey && (
        <div className="p-1.5 bg-amber-100/80 border-b border-ink/20 text-[8px] font-bold uppercase text-ink shrink-0">
          Set VITE_GROQ_API_KEY in .env to enable.
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 min-h-0">
        {messages.length === 0 && (
          <p className="text-[10px] text-ink/60 font-bold uppercase">Ask about fieldwork, sites, or methods.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-[11px] ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className="text-[8px] font-black uppercase text-ink/50 block mb-0.5">{m.role === 'user' ? 'You' : 'ArchBot'}</span>
            <div className={`inline-block p-1.5 rounded border max-w-[90%] ${m.role === 'user' ? 'bg-ink text-white border-ink' : 'bg-white/80 border-ink/20'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="text-[8px] font-black uppercase text-ink/50">ArchBot</span>
            <div className="inline-block p-1.5 bg-white/80 border border-ink/20 rounded animate-pulse text-[11px]">Thinking…</div>
          </div>
        )}
        {error && <p className="text-[9px] text-red-600 font-bold uppercase">{error}</p>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-1.5 border-t border-ink/20 bg-white/60 flex gap-1 items-center shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask ArchBot…"
          className="flex-1 min-h-[32px] px-2 py-1 border border-ink/30 rounded text-[10px] font-medium text-ink outline-none focus:border-ink bg-white/80"
          disabled={!hasKey || loading}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!hasKey || loading || !input.trim()}
          className="min-h-[32px] px-2 py-1 bg-ink text-white text-[9px] font-black uppercase rounded border border-ink disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  )
}
