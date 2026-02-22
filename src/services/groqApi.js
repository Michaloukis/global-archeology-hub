/**
 * Groq Chat API – no SDK, raw fetch.
 * Uses VITE_GROQ_API_KEY from env (never commit the key).
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'llama-3.3-70b-versatile'

/**
 * @param {Object} opts
 * @param {string} opts.systemPrompt - System / persona prompt (e.g. archaeology hub + role).
 * @param {Array<{ role: 'user'|'assistant', content: string }>} opts.messages - Conversation history.
 * @param {string} [opts.model] - Model ID (default: llama-3.3-70b-versatile).
 * @param {number} [opts.maxTokens] - Max tokens to generate.
 * @returns {Promise<string>} Assistant reply text.
 */
export async function chatWithGroq({ systemPrompt, messages, model = DEFAULT_MODEL, maxTokens = 1024 }) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    throw new Error('VITE_GROQ_API_KEY is not set. Add it to your .env file.')
  }

  const body = {
    model,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ]
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Groq API error: ${res.status}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}
