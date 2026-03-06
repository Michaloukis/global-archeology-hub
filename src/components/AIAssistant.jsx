import { useState, useRef, useEffect, useCallback } from 'react'
import { chatWithGroq } from '../services/groqApi'

const MIN_W = 320
const MIN_H = 300
const DEFAULT_W = 400
const DEFAULT_H = 560

function buildSystemPrompt(role) {
  const base = `You are the AI assistant for the Global Archaeology Hub. You help users with archaeology-related questions, fieldwork, research, and education. Be concise, professional, and accurate.`
  const roleHint = {
    'Director': 'The user is a Director: help with site oversight, team coordination, approvals, reports, and high-level strategy.',
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

  // Popup position/size for embedded desktop (draggable + resizable)
  const [popupPosition, setPopupPosition] = useState(null)
  const [popupSize, setPopupSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const dragStart = useRef({ x: 0, y: 0, left: 0, top: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0, handle: '' })
  const popupRef = useRef(null)

  // Set initial position when embedded popup opens (desktop)
  useEffect(() => {
    if (!embedded || !controlledOpen || typeof window === 'undefined') return
    const w = Math.min(DEFAULT_W, window.innerWidth - 48)
    const h = Math.min(DEFAULT_H, window.innerHeight - 96)
    setPopupSize({ w, h })
    setPopupPosition({
      x: window.innerWidth - 32 - w,
      y: Math.max(24, (window.innerHeight - h) / 2)
    })
  }, [embedded, controlledOpen])

  const onDragStart = useCallback((e) => {
    if (!popupPosition) return
    e.preventDefault()
    dragStart.current = { x: e.clientX, y: e.clientY, left: popupPosition.x, top: popupPosition.y }
    const onMove = (e2) => {
      const dx = e2.clientX - dragStart.current.x
      const dy = e2.clientY - dragStart.current.y
      setPopupPosition({
        x: Math.max(0, dragStart.current.left + dx),
        y: Math.max(0, dragStart.current.top + dy)
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [popupPosition])

  const onResizeStart = useCallback((e, handle) => {
    e.stopPropagation()
    const pos = popupPosition || { x: 0, y: 0 }
    resizeStart.current = { x: e.clientX, y: e.clientY, w: popupSize.w, h: popupSize.h, left: pos.x, top: pos.y, handle }
    const onMove = (e2) => {
      const dx = e2.clientX - resizeStart.current.x
      const dy = e2.clientY - resizeStart.current.y
      let { w, h, left, top } = resizeStart.current
      const hdl = resizeStart.current.handle
      if (hdl.includes('e')) w = Math.max(MIN_W, w + dx)
      if (hdl.includes('w')) { const dw = Math.min(dx, w - MIN_W); w -= dw; left = resizeStart.current.left + dw }
      if (hdl.includes('s')) h = Math.max(MIN_H, h + dy)
      if (hdl.includes('n')) { const dh = Math.min(dy, h - MIN_H); h -= dh; top = resizeStart.current.top + dh }
      setPopupSize({ w, h })
      if (hdl.includes('w') || hdl.includes('n')) setPopupPosition({ x: left, y: top })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [popupPosition, popupSize])

  const cornerHandle = (handle, cursor) => {
    const isR = handle.includes('e')
    const isB = handle.includes('s')
    return (
      <div
        key={handle}
        role="presentation"
        className="absolute z-10 bg-transparent"
        style={{
          width: 14,
          height: 14,
          [isR ? 'right' : 'left']: -2,
          [isB ? 'bottom' : 'top']: -2,
          cursor
        }}
        onMouseDown={(e) => onResizeStart(e, handle)}
      />
    )
  }

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

  const headerBlock = (
    <div className="shrink-0 flex justify-between items-center p-4 border-b border-ink/20 bg-white rounded-t-2xl md:rounded-t-2xl" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      <span className="text-sm font-semibold text-ink">Hub Assistant · {role}</span>
      <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5" aria-label="Close">Close</button>
    </div>
  )

  const panelContent = (
    <>
      {!hasKey && (
        <div className="shrink-0 p-3 mx-4 mt-3 rounded-xl bg-amber-50 border border-ink/20 text-xs text-ink/80">
          Set VITE_GROQ_API_KEY in .env to enable the assistant.
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-sm text-ink/60">Ask about fieldwork, sites, methods, or your role.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className="text-xs text-ink/50 block mb-1">{m.role === 'user' ? 'You' : 'Assistant'}</span>
            <div className={`inline-block max-w-[85%] p-3 rounded-2xl text-left ${m.role === 'user' ? 'bg-ink text-white' : 'bg-white border border-ink/20 text-ink shadow-[0_2px_8px_rgba(44,40,37,0.06)]'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="text-xs text-ink/50 block mb-1">Assistant</span>
            <div className="inline-block p-3 rounded-2xl bg-white border border-ink/20 text-ink/60 animate-pulse">Thinking…</div>
          </div>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <div ref={messagesEndRef} />
      </div>
      <div className="shrink-0 p-4 border-t border-ink/20 bg-white rounded-b-2xl md:rounded-b-2xl flex gap-2 items-center" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask the Hub…"
          className="flex-1 min-h-[44px] px-4 py-3 rounded-xl border border-ink/20 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20"
          disabled={!hasKey || loading}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!hasKey || loading || !input.trim()}
          className="min-h-[44px] px-4 py-3 rounded-xl bg-ink text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed touch-target"
        >
          Send
        </button>
      </div>
    </>
  )

  if (embedded) {
    if (!open) return null
    const isDesktopPopup = popupPosition !== null
    return (
      <>
        {/* No backdrop on desktop so no dark grey; full-screen overlay only on mobile */}
        <div className="fixed inset-0 z-[199] bg-ink/20 md:pointer-events-none md:bg-transparent" aria-hidden onClick={() => setOpen(false)} />
        <div
          ref={popupRef}
          className="fixed inset-0 z-[200] flex flex-col bg-[#f8f3e8] md:inset-auto md:left-[auto] md:right-8 md:top-24 md:bottom-24 md:w-full md:max-w-md md:rounded-2xl md:border md:border-ink/20 md:bg-white md:shadow-[0_8px_32px_rgba(44,40,37,0.15)] md:flex md:flex-col"
          style={isDesktopPopup ? {
            left: popupPosition.x,
            top: popupPosition.y,
            right: 'auto',
            bottom: 'auto',
            width: popupSize.w,
            height: popupSize.h,
            maxWidth: 'none',
            minHeight: MIN_H
          } : undefined}
        >
          {/* Draggable header (desktop only) */}
          <div
            className="shrink-0 flex justify-between items-center p-4 border-b border-ink/20 bg-white rounded-t-2xl md:rounded-t-2xl select-none"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', ...(isDesktopPopup ? { cursor: 'move' } : {}) }}
            onMouseDown={isDesktopPopup ? onDragStart : undefined}
          >
            <span className="text-sm font-semibold text-ink">Hub Assistant · {role}</span>
            <button type="button" onClick={() => setOpen(false)} onMouseDown={(e) => e.stopPropagation()} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink/60 hover:text-ink rounded-xl hover:bg-ink/5" aria-label="Close">Close</button>
          </div>
          {panelContent}
          {/* Resize handles (desktop only, corner arrows) */}
          {isDesktopPopup && (
            <>
              {cornerHandle('nw', 'nwse-resize')}
              {cornerHandle('ne', 'nesw-resize')}
              {cornerHandle('sw', 'nesw-resize')}
              {cornerHandle('se', 'nwse-resize')}
            </>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setInternalOpen(!internalOpen)}
        className="fixed z-50 w-16 h-16 sm:w-14 sm:h-14 rounded-full bg-ink text-white font-semibold text-lg shadow-lg border border-ink/20 hover:opacity-90 transition-opacity touch-target"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))', left: 'max(1rem, env(safe-area-inset-left))', right: 'auto' }}
        title="AI Assistant"
        aria-label="Toggle AI Assistant"
      >
        AI
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[49] bg-ink/20 sm:hidden" aria-hidden onClick={() => setInternalOpen(false)} />
          <div
            className="fixed inset-0 z-50 flex flex-col bg-[#f8f3e8] sm:inset-auto sm:left-[max(1rem,env(safe-area-inset-left))] sm:right-auto sm:top-auto sm:bottom-[max(5.5rem,calc(5.5rem+env(safe-area-inset-bottom)))] sm:max-w-md sm:max-h-[75vh] sm:rounded-2xl sm:border sm:border-ink/20 sm:bg-white sm:shadow-[0_8px_32px_rgba(44,40,37,0.15)] sm:flex sm:flex-col"
          >
            {headerBlock}
            {panelContent}
          </div>
        </>
      )}
    </>
  )
}
