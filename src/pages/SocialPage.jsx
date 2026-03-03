const SOCIAL_POSTS = [
  { user: 'User3', time: '2h ago', likes: 16, text: 'Excited to be starting a new dig site in Jordan! Hoping to uncover some interesting artifacts.', likesBottom: 24, comments: 8 },
  { user: 'User3', time: '2h ago', likes: 16, text: 'Excited to be starting a new dig site in Jordan! Hoping to uncover some interesting artifacts.', likesBottom: 24, comments: 8 },
]

export default function SocialPage({ profile }) {
  return (
    <div className="relative parchment-main min-h-full p-6 md:p-8 flex flex-col items-center justify-start">
      <div className="w-full max-w-2xl">
        <h1 className="text-xl font-bold text-ink border-b border-ink/20 pb-2 mb-6">Social Activity</h1>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-6">
          <div className="space-y-4">
            {SOCIAL_POSTS.map((post, i) => (
              <div key={i} className="w-full text-left rounded-xl border border-ink/10 p-4 hover:bg-ink/5 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink/10 shrink-0" />
                    <span className="text-sm font-medium text-ink">{post.user}</span>
                  </div>
                  <span className="text-xs text-ink/50">{post.time}</span>
                </div>
                <p className="text-sm text-ink/70 mt-3 leading-snug">{post.text}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-ink/50">
                  <span>❤️ {post.likesBottom}</span>
                  <span>💬 {post.comments}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
