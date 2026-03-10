import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const STORAGE_KEY_CHATROOM = 'global-arch-social-selected-chatroom';

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

export default function SocialActivityWidget({ profile, onOpenSocial }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !profile?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data: membersData } = await supabase
          .from('chatroom_members')
          .select('chatroom_id, chatrooms(id, name)')
          .eq('user_id', profile.id);
        const chatrooms = (membersData || [])
          .map((r) => r.chatrooms)
          .filter(Boolean)
          .reduce((acc, c) => (c && !acc.find((x) => x.id === c.id) ? [...acc, c] : acc), []);
        const roomIds = chatrooms.map((c) => c.id);
        const roomMap = Object.fromEntries(chatrooms.map((c) => [c.id, c.name]));

        if (roomIds.length === 0) {
          if (!cancelled) setItems([]);
          return;
        }

        const [postsRes, messagesRes] = await Promise.all([
          supabase
            .from('social_posts')
            .select('id, content, created_at, chatroom_id, profiles:author_id(full_name, username)')
            .in('chatroom_id', roomIds)
            .order('created_at', { ascending: false })
            .limit(15),
          supabase
            .from('chat_messages')
            .select('id, content, created_at, chatroom_id, profiles:sender_id(full_name, username)')
            .in('chatroom_id', roomIds)
            .order('created_at', { ascending: false })
            .limit(15),
        ]);

        if (cancelled) return;

        const postItems = (postsRes.data || []).map((p) => ({
          type: 'post',
          id: `post-${p.id}`,
          chatroom_id: p.chatroom_id,
          chatroom_name: roomMap[p.chatroom_id] || 'Chatroom',
          content: (p.content || '').slice(0, 80) + ((p.content || '').length > 80 ? '…' : ''),
          created_at: p.created_at,
          author: p.profiles?.full_name || p.profiles?.username || 'Someone',
        }));
        const messageItems = (messagesRes.data || []).map((m) => ({
          type: 'message',
          id: `msg-${m.id}`,
          chatroom_id: m.chatroom_id,
          chatroom_name: roomMap[m.chatroom_id] || 'Chatroom',
          content: (m.content || '').slice(0, 80) + ((m.content || '').length > 80 ? '…' : ''),
          created_at: m.created_at,
          author: m.profiles?.full_name || m.profiles?.username || 'Someone',
        }));

        const merged = [...postItems, ...messageItems]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 12);
        setItems(merged);
      } catch (e) {
        if (!cancelled) setItems([]);
        console.error('Social activity fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const handleOpenSocialHub = () => {
    onOpenSocial?.();
  };

  const handleItemClick = (chatroomId) => {
    try {
      localStorage.setItem(STORAGE_KEY_CHATROOM, chatroomId);
    } catch (_) {}
    onOpenSocial?.(chatroomId);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between border-b border-ink/30 pb-1 mb-1.5 shrink-0">
        <h3 className="text-[11px] font-bold text-ink">Social Activity</h3>
        <button type="button" onClick={handleOpenSocialHub} className="text-[9px] font-medium text-ink/70 hover:text-ink">
          Open Social Hub →
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-[9px] text-ink/50 animate-pulse py-1.5">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-[9px] text-ink/50 py-1.5">No recent posts or messages.</p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item.chatroom_id)}
              className="w-full text-left rounded border border-ink/15 bg-white/60 hover:bg-ink/5 hover:border-ink/25 px-1.5 py-1 transition-colors"
            >
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[8px] font-semibold text-ink/70 uppercase">{item.type === 'post' ? 'Post' : 'Chat'}</span>
                <span className="text-[8px] text-ink/50">· {item.chatroom_name}</span>
                <span className="text-[8px] text-ink/40 ml-auto">{formatWhen(item.created_at)}</span>
              </div>
              <p className="text-[9px] text-ink/80 mt-0.5 line-clamp-2">{item.author}: {item.content || '—'}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
