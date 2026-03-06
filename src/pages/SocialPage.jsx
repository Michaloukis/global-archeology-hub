import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { isArcheologist as isArcheologistRole, isDirector as isDirectorRole } from '../utils/roles';

const STORAGE_KEY_CHATROOM = 'global-arch-social-selected-chatroom';
const STORAGE_KEY_TAB = 'global-arch-social-tab';

export default function SocialPage({ profile }) {
  const [chatrooms, setChatrooms] = useState([]);
  const [selectedChatroomId, setSelectedChatroomIdState] = useState(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(max-width: 767px)')?.matches ?? window.innerWidth < 768;
  });
  const [mobilePanel, setMobilePanel] = useState('list'); // 'list' | 'room'
  const [tab, setTabState] = useState(() => {
    try {
      const t = localStorage.getItem(STORAGE_KEY_TAB);
      return t === 'chat' || t === 'posts' ? t : 'posts';
    } catch (_) {
      return 'posts';
    }
  });
  const setSelectedChatroomId = (id) => {
    setSelectedChatroomIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY_CHATROOM, id);
      else localStorage.removeItem(STORAGE_KEY_CHATROOM);
    } catch (_) {}
  };
  const setTab = (t) => {
    setTabState(t);
    try {
      localStorage.setItem(STORAGE_KEY_TAB, t);
    } catch (_) {}
  };
  const [chatroomsLoading, setChatroomsLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postLikesMap, setPostLikesMap] = useState({}); // post_id -> { count, liked }
  const [commentsMap, setCommentsMap] = useState({}); // post_id -> [{ id, content, author, created_at }]
  const [commentsOpen, setCommentsOpen] = useState({}); // post_id -> bool
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingPost, setSendingPost] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const channelRef = useRef(null);
  const [startChatOpen, setStartChatOpen] = useState(false);
  const [startChatMode, setStartChatMode] = useState('site'); // 'site' | 'dm' | 'group'
  const [sitesWithoutRoom, setSitesWithoutRoom] = useState([]);
  const [startChatLoading, setStartChatLoading] = useState(false);
  const [creatingRoomForSiteId, setCreatingRoomForSiteId] = useState(null);
  const [startChatError, setStartChatError] = useState(null);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [creatingDmForUserId, setCreatingDmForUserId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState([]); // [{id, full_name, username, role}]
  const [creatingGroup, setCreatingGroup] = useState(false);

  const selectedChatroom = chatrooms.find((c) => c.id === selectedChatroomId);

  const openStartChat = (mode = 'site') => {
    setStartChatMode(mode);
    setStartChatError(null);
    setStartChatOpen(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = (e) => setIsMobile(!!e.matches);
    try {
      mql.addEventListener('change', onChange);
      setIsMobile(!!mql.matches);
      return () => mql.removeEventListener('change', onChange);
    } catch (_) {
      // Safari fallback
      mql.addListener?.(onChange);
      setIsMobile(!!mql.matches);
      return () => mql.removeListener?.(onChange);
    }
  }, []);

  const fetchChatrooms = async () => {
    if (!supabase || !profile?.id) return;
    setChatroomsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chatroom_members')
        .select('chatroom_id, chatrooms(id, name, site_id, room_type, dm_key, created_by)')
        .eq('user_id', profile.id);
      if (error) throw error;
      const list = (data || [])
        .map((r) => r.chatrooms)
        .filter(Boolean)
        .reduce((acc, c) => {
          if (c && !acc.find((x) => x.id === c.id)) acc.push(c);
          return acc;
        }, []);
      setChatrooms(list);
      if (list.length > 0) {
        try {
          const saved = localStorage.getItem(STORAGE_KEY_CHATROOM);
          const inList = saved && list.some((c) => c.id === saved);
          if (inList) {
            setSelectedChatroomId(saved);
            setMobilePanel('room');
          } else if (!isMobile) {
            setSelectedChatroomId(list[0].id);
          } else {
            setSelectedChatroomId(null);
            setMobilePanel('list');
          }
        } catch (_) {
          if (!isMobile) setSelectedChatroomId(list[0].id);
          else {
            setSelectedChatroomId(null);
            setMobilePanel('list');
          }
        }
      } else {
        setSelectedChatroomId(null);
        setMobilePanel('list');
      }
    } catch (e) {
      setChatrooms([]);
      console.error('Fetch chatrooms error:', e);
    } finally {
      setChatroomsLoading(false);
    }
  };

  // Fetch chatrooms for current user (Field / Chief)
  useEffect(() => {
    if (!supabase || !profile?.id || !isArcheologistRole(profile)) return;
    fetchChatrooms();
  }, [profile?.id, profile?.role]);

  // When "Start a chat" modal opens, load sites that don't have a chatroom yet
  useEffect(() => {
    if (!startChatOpen || startChatMode !== 'site' || !supabase || !profile?.id || !isArcheologistRole(profile)) return;
    (async () => {
      try {
        const isChief = isDirectorRole(profile);
        let siteIds = [];
        if (isChief) {
          const { data: reg } = await supabase.from('Registry').select('site_id').eq('chief_arch_id', profile.id);
          siteIds = [...new Set((reg || []).map((r) => r.site_id).filter(Boolean))];
          const { data: created } = await supabase.from('sites').select('id').eq('created_by', profile.id);
          siteIds = [...new Set([...siteIds, ...(created || []).map((s) => s.id)])];
        } else {
          const { data: reg } = await supabase.from('Registry').select('site_id').eq('field_arch_id', profile.id).eq('status', 'Approved');
          siteIds = [...new Set((reg || []).map((r) => r.site_id).filter(Boolean))];
        }
        if (siteIds.length === 0) {
          setSitesWithoutRoom([]);
          return;
        }
        const { data: existingRooms } = await supabase.from('chatrooms').select('site_id');
        const roomSiteIds = new Set((existingRooms || []).map((r) => r.site_id));
        const withoutRoom = siteIds.filter((id) => !roomSiteIds.has(id));
        if (withoutRoom.length === 0) {
          setSitesWithoutRoom([]);
          return;
        }
        const { data: sites } = await supabase.from('sites').select('id, name').in('id', withoutRoom);
        setSitesWithoutRoom(sites || []);
      } catch (e) {
        setSitesWithoutRoom([]);
        console.error('Fetch sites without room error:', e);
      }
    })();
  }, [startChatOpen, startChatMode, profile?.id, profile?.role]);

  const searchPeople = async (q) => {
    if (!supabase || !profile?.id) return;
    const query = (q || '').trim();
    if (query.length < 2) {
      setPeopleResults([]);
      return;
    }
    setPeopleLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, role')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(20);
      if (error) throw error;
      const filtered = (data || []).filter((p) => p.id && p.id !== profile.id);
      setPeopleResults(filtered);
    } catch (e) {
      console.error('Search people error:', e);
      setPeopleResults([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  useEffect(() => {
    if (!startChatOpen || (startChatMode !== 'dm' && startChatMode !== 'group')) return;
    const t = setTimeout(() => { searchPeople(peopleQuery); }, 250);
    return () => clearTimeout(t);
  }, [startChatOpen, startChatMode, peopleQuery]);

  const handleStartChat = async (siteId, siteName) => {
    if (!supabase || !profile?.id || creatingRoomForSiteId) return;
    setCreatingRoomForSiteId(siteId);
    setStartChatError(null);
    try {
      const { data: room, error: roomErr } = await supabase.from('chatrooms').insert({ site_id: siteId, name: siteName || 'Dig site room', room_type: 'site' }).select('id').single();
      let chatroomId = room?.id;
      if (roomErr) {
        if (roomErr.code === '23505') {
          const { data: existing } = await supabase.from('chatrooms').select('id').eq('site_id', siteId).maybeSingle();
          if (existing) chatroomId = existing.id;
        }
        if (!chatroomId) throw roomErr;
      }
      if (chatroomId) {
        const { error: memberErr } = await supabase.from('chatroom_members').insert({ chatroom_id: chatroomId, user_id: profile.id });
        if (memberErr && memberErr.code !== '23505') throw memberErr;
        setStartChatOpen(false);
        setSitesWithoutRoom([]);
        setStartChatError(null);
        await fetchChatrooms();
        setSelectedChatroomId(chatroomId);
        if (isMobile) setMobilePanel('room');
      }
    } catch (e) {
      console.error('Start chat error:', e);
      setStartChatError(e?.message || 'Could not create or join chatroom.');
    } finally {
      setCreatingRoomForSiteId(null);
    }
  };

  const getDisplayName = (p) => p?.full_name || p?.username || 'Member';
  const getFirstName = (p) => (getDisplayName(p).split(' ')[0] || getDisplayName(p)).trim();

  const handleStartDm = async (targetProfile) => {
    if (!supabase || !profile?.id || !targetProfile?.id || creatingDmForUserId) return;
    setCreatingDmForUserId(targetProfile.id);
    setStartChatError(null);
    try {
      const a = String(profile.id);
      const b = String(targetProfile.id);
      const dmKey = [a, b].sort().join(':');
      const dmName = `DM: ${getFirstName(profile)} & ${getFirstName(targetProfile)}`;
      const { data: room, error: roomErr } = await supabase
        .from('chatrooms')
        .insert({ room_type: 'dm', dm_key: dmKey, name: dmName, created_by: profile.id })
        .select('id')
        .single();
      let chatroomId = room?.id;
      if (roomErr) {
        if (roomErr.code === '23505') {
          const { data: existing } = await supabase.from('chatrooms').select('id').eq('dm_key', dmKey).maybeSingle();
          if (existing) chatroomId = existing.id;
        }
        if (!chatroomId) throw roomErr;
      }
      if (chatroomId) {
        const ids = [profile.id, targetProfile.id];
        for (const uid of ids) {
          const { error: memberErr } = await supabase.from('chatroom_members').insert({ chatroom_id: chatroomId, user_id: uid });
          if (memberErr && memberErr.code !== '23505') throw memberErr;
        }
        setStartChatOpen(false);
        setPeopleQuery('');
        setPeopleResults([]);
        await fetchChatrooms();
        setSelectedChatroomId(chatroomId);
        if (isMobile) setMobilePanel('room');
      }
    } catch (e) {
      console.error('Start DM error:', e);
      setStartChatError(e?.message || 'Could not create or open direct message.');
    } finally {
      setCreatingDmForUserId(null);
    }
  };

  const addGroupMember = (p) => {
    if (!p?.id || p.id === profile?.id) return;
    setGroupMembers((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
  };
  const removeGroupMember = (id) => setGroupMembers((prev) => prev.filter((p) => p.id !== id));

  const handleCreateGroup = async () => {
    if (!supabase || !profile?.id || creatingGroup) return;
    if (groupMembers.length === 0) {
      setStartChatError('Pick at least one person for the group.');
      return;
    }
    setCreatingGroup(true);
    setStartChatError(null);
    try {
      const memberNames = [profile, ...groupMembers].map(getFirstName);
      const fallbackName = (() => {
        const shown = memberNames.slice(0, 3).join(', ');
        const more = memberNames.length - 3;
        return `Group: ${shown}${more > 0 ? ` +${more}` : ''}`;
      })();
      const name = (groupName || '').trim() || fallbackName;
      const { data: room, error: roomErr } = await supabase
        .from('chatrooms')
        .insert({ room_type: 'group', name, created_by: profile.id })
        .select('id')
        .single();
      if (roomErr) throw roomErr;
      const chatroomId = room?.id;
      if (!chatroomId) throw new Error('No chatroom id returned.');
      const ids = [profile.id, ...groupMembers.map((p) => p.id)];
      for (const uid of ids) {
        const { error: memberErr } = await supabase.from('chatroom_members').insert({ chatroom_id: chatroomId, user_id: uid });
        if (memberErr && memberErr.code !== '23505') throw memberErr;
      }
      setStartChatOpen(false);
      setPeopleQuery('');
      setPeopleResults([]);
      setGroupName('');
      setGroupMembers([]);
      await fetchChatrooms();
      setSelectedChatroomId(chatroomId);
      if (isMobile) setMobilePanel('room');
    } catch (e) {
      console.error('Create group error:', e);
      setStartChatError(e?.message || 'Could not create group chat.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSelectRoom = (roomId) => {
    setSelectedChatroomId(roomId);
    if (isMobile) setMobilePanel('room');
  };

  const handleBackToList = () => {
    setMobilePanel('list');
  };

  // Fetch posts for selected chatroom
  useEffect(() => {
    if (!supabase || !selectedChatroomId || !profile?.id) {
      setPosts([]);
      setPostLikesMap({});
      return;
    }
    let cancelled = false;
    setPostsLoading(true);
    (async () => {
      try {
        const { data: postsData, error: postsErr } = await supabase
          .from('social_posts')
          .select('id, content, image_url, created_at, author_id, profiles:author_id(full_name, username, avatar_url)')
          .eq('chatroom_id', selectedChatroomId)
          .order('created_at', { ascending: false });
        if (postsErr) throw postsErr;
        if (!cancelled) setPosts(postsData || []);

        const postIds = (postsData || []).map((p) => p.id);
        if (postIds.length === 0) {
          if (!cancelled) setPostLikesMap({});
          return;
        }
        const { data: likesData } = await supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds);
        const countByPost = {};
        const likedByMe = {};
        (likesData || []).forEach((l) => {
          countByPost[l.post_id] = (countByPost[l.post_id] || 0) + 1;
          if (l.user_id === profile.id) likedByMe[l.post_id] = true;
        });
        const likesMap = {};
        postIds.forEach((id) => { likesMap[id] = { count: countByPost[id] || 0, liked: !!likedByMe[id] }; });
        if (!cancelled) setPostLikesMap(likesMap);
      } catch (e) {
        if (!cancelled) setPosts([]);
        console.error('Fetch posts error:', e);
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedChatroomId, profile?.id]);

  // Fetch comments for a post when opened
  const loadComments = async (postId) => {
    if (!supabase || commentsMap[postId]) return;
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('id, content, created_at, author_id, profiles:author_id(full_name, username)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCommentsMap((prev) => ({ ...prev, [postId]: data || [] }));
    } catch (e) {
      console.error('Fetch comments error:', e);
    }
  };

  const toggleComments = (postId) => {
    setCommentsOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
    if (!commentsMap[postId]) loadComments(postId);
  };

  // Fetch chat messages and subscribe to Realtime (fetch messages first, then profiles separately to avoid RLS/join issues)
  useEffect(() => {
    if (!supabase || !selectedChatroomId || !profile?.id) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    (async () => {
      try {
        const { data: rows, error } = await supabase
          .from('chat_messages')
          .select('id, content, created_at, sender_id')
          .eq('chatroom_id', selectedChatroomId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        const list = rows || [];
        const senderIds = [...new Set(list.map((m) => m.sender_id).filter(Boolean))];
        let profileMap = {};
        if (senderIds.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('id, full_name, username, avatar_url, role').in('id', senderIds);
          if (profilesData) profileMap = Object.fromEntries(profilesData.map((p) => [String(p.id), p]));
        }
        const currentUserProfile = profile ? { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url, role: profile.role } : null;
        const messagesWithProfiles = list.map((m) => {
          const p = profileMap[String(m.sender_id)] ?? (m.sender_id === profile?.id ? currentUserProfile : null);
          return { ...m, profiles: p };
        });
        if (!cancelled) setMessages(messagesWithProfiles);
      } catch (e) {
        if (!cancelled) setMessages([]);
        console.error('Fetch messages error:', e);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();

    const channel = supabase
      .channel(`chat:${selectedChatroomId}`)
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        const row = payload?.payload;
        if (!row?.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev;
          return [...prev, row];
        });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chatroom_id=eq.${selectedChatroomId}` },
        async (payload) => {
          const row = payload.new;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { id: row.id, content: row.content, created_at: row.created_at, sender_id: row.sender_id, profiles: null }];
          });
          const { data: author } = await supabase.from('profiles').select('full_name, username, avatar_url, role').eq('id', row.sender_id).single();
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, profiles: author } : m)));
        }
      )
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedChatroomId, profile?.id]);

  const scrollToMessagesEnd = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (messages.length) scrollToMessagesEnd(); }, [messages.length]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!supabase || !selectedChatroomId || !profile?.id || !newPostContent.trim() || sendingPost) return;
    setSendingPost(true);
    try {
      const { error } = await supabase.from('social_posts').insert({
        chatroom_id: selectedChatroomId,
        author_id: profile.id,
        content: newPostContent.trim(),
      });
      if (error) throw error;
      setNewPostContent('');
      const { data: fresh } = await supabase
        .from('social_posts')
        .select('id, content, image_url, created_at, author_id, profiles:author_id(full_name, username, avatar_url)')
        .eq('chatroom_id', selectedChatroomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (fresh) setPosts((prev) => [fresh, ...prev]);
    } catch (e) {
      console.error('Create post error:', e);
    } finally {
      setSendingPost(false);
    }
  };

  const handleLike = async (postId) => {
    if (!supabase || !profile?.id) return;
    const { liked } = postLikesMap[postId] || {};
    try {
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', profile.id);
        setPostLikesMap((prev) => ({ ...prev, [postId]: { count: Math.max(0, (prev[postId]?.count || 0) - 1), liked: false } }));
      } else {
        await supabase.from('post_likes').insert({ post_id: postId, user_id: profile.id });
        setPostLikesMap((prev) => ({ ...prev, [postId]: { count: (prev[postId]?.count || 0) + 1, liked: true } }));
      }
    } catch (e) {
      console.error('Like error:', e);
    }
  };

  const handleAddComment = async (postId, content) => {
    if (!supabase || !profile?.id || !content?.trim()) return;
    try {
      const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: profile.id, content: content.trim() }).select('id, content, created_at, author_id').single();
      if (error) throw error;
      const author = { full_name: profile.full_name, username: profile.username };
      setCommentsMap((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), { ...data, profiles: author }] }));
    } catch (e) {
      console.error('Add comment error:', e);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!supabase || !selectedChatroomId || !profile?.id || !newMessageContent.trim() || sendingMessage) return;
    const content = newMessageContent.trim();
    setNewMessageContent('');
    setSendingMessage(true);
    try {
      const { data: row, error } = await supabase
        .from('chat_messages')
        .insert({
          chatroom_id: selectedChatroomId,
          sender_id: profile.id,
          content,
        })
        .select('id, content, created_at, sender_id')
        .single();
      if (error) throw error;
      const author = { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url, role: profile.role };
      const msg = { id: row.id, content: row.content, created_at: row.created_at, sender_id: row.sender_id, profiles: author };
      setMessages((prev) => [...prev, msg]);
      try {
        // Fallback for cases where Postgres changes aren't delivered (replication/RLS):
        // broadcast the new message to everyone currently in this room.
        channelRef.current?.send?.({
          type: 'broadcast',
          event: 'chat_message',
          payload: msg,
        });
      } catch (_) {}
    } catch (e) {
      console.error('Send message error:', e);
      setNewMessageContent(content);
    } finally {
      setSendingMessage(false);
    }
  };

  if (!profile) {
    return (
      <div className="relative parchment-main min-h-full p-6 md:p-8 flex flex-col items-center justify-center">
        <p className="text-sm text-ink/60">Loading…</p>
      </div>
    );
  }

  if (!isArcheologistRole(profile)) {
    return (
      <div className="relative parchment-main min-h-full p-6 md:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-8 text-center">
          <h2 className="text-xl font-bold text-ink border-b border-ink/20 pb-2 mb-4">Social Hub</h2>
          <p className="text-sm text-ink/70">
            Social Hub is for Field Archeologists and Directors. Join a dig site from the Map and get approved to access mission-specific discussions and chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative parchment-main min-h-full flex flex-col md:flex-row overflow-hidden">
      {/* Left sidebar: chatroom list */}
      <aside
        className={`w-full md:w-56 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r border-ink/20 bg-white/80 flex-col ${
          isMobile ? (mobilePanel === 'list' ? 'flex' : 'hidden') : 'flex'
        }`}
      >
        <div className="p-3 border-b border-ink/20">
          <h2 className="text-sm font-bold text-ink uppercase tracking-wider">Social Hub</h2>
          <p className="text-[10px] text-ink/50 mt-0.5">Select a room or start a chat</p>
          <button
            type="button"
            onClick={() => openStartChat(startChatMode)}
            className="mt-3 w-full rounded-xl border-2 border-ink/30 bg-ink text-white py-2 px-3 text-xs font-bold uppercase tracking-wider hover:bg-ink/90 hover:border-ink/50 transition-colors"
          >
            Start a chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {chatroomsLoading ? (
            <div className="p-4 text-center text-xs text-ink/50 animate-pulse">Loading…</div>
          ) : chatrooms.length === 0 ? (
            <div className="p-4">
              <div className="text-center text-xs text-ink/50">
                No rooms yet. Start a direct message or create a group chat.
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => openStartChat('dm')}
                  className="w-full rounded-xl border border-ink/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                >
                  Message someone
                </button>
                <button
                  type="button"
                  onClick={() => openStartChat('group')}
                  className="w-full rounded-xl border border-ink/20 bg-white/80 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-ink/5"
                >
                  Create a group
                </button>
                <button
                  type="button"
                  onClick={() => openStartChat('site')}
                  className="w-full rounded-xl border border-ink/15 bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                >
                  Dig site room (optional)
                </button>
              </div>
            </div>
          ) : (
            <ul className="p-2 space-y-0.5">
              {chatrooms.map((room) => (
                <li key={room.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectRoom(room.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedChatroomId === room.id ? 'bg-ink/10 text-ink' : 'text-ink/70 hover:bg-ink/5 hover:text-ink'}`}
                  >
                    <span className="block truncate">{room.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Start a chat modal */}
      {startChatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setStartChatOpen(false)}>
          <div className="bg-white rounded-2xl border border-ink/20 shadow-[0_8px_32px_rgba(44,40,37,0.15)] w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-ink/20 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink uppercase tracking-tight">Start a chat</h3>
              <button type="button" onClick={() => setStartChatOpen(false)} className="text-ink/60 hover:text-ink p-1 rounded-lg hover:bg-ink/10 text-sm font-medium" aria-label="Close">×</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="flex gap-1 bg-ink/5 p-1 rounded-xl border border-ink/10 mb-3">
                {[
                  { id: 'site', label: 'Dig site' },
                  { id: 'dm', label: 'Direct' },
                  { id: 'group', label: 'Group' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setStartChatMode(m.id); setStartChatError(null); }}
                    className={`flex-1 min-h-[40px] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${startChatMode === m.id ? 'bg-white border border-ink/20 text-ink shadow-sm' : 'text-ink/60 hover:text-ink'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {startChatError && (
                <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{startChatError}</div>
              )}

              {startChatMode === 'site' && (
                <>
                  <p className="text-xs text-ink/60 mb-3">Create or open the dig site room for a site you’re assigned to.</p>
                  {startChatLoading ? (
                    <p className="text-sm text-ink/50 py-4 text-center">Loading…</p>
                  ) : sitesWithoutRoom.length === 0 ? (
                    <p className="text-sm text-ink/50 py-4 text-center">No sites without a room. Every site you’re on already has one.</p>
                  ) : (
                    <ul className="space-y-1">
                      {sitesWithoutRoom.map((site) => (
                        <li key={site.id}>
                          <button
                            type="button"
                            onClick={() => handleStartChat(site.id, site.name)}
                            disabled={creatingRoomForSiteId === site.id}
                            className="w-full text-left rounded-xl border border-ink/20 px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5 hover:border-ink/30 transition-colors disabled:opacity-50"
                          >
                            {creatingRoomForSiteId === site.id ? 'Creating…' : site.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {(startChatMode === 'dm' || startChatMode === 'group') && (
                <>
                  <p className="text-xs text-ink/60 mb-2">
                    {startChatMode === 'dm' ? 'Search a person to start a direct message.' : 'Build a group chat by adding people.'}
                  </p>
                  <input
                    type="text"
                    value={peopleQuery}
                    onChange={(e) => setPeopleQuery(e.target.value)}
                    placeholder="Search people…"
                    className="w-full min-h-[44px] rounded-xl border border-ink/20 px-3 py-2 text-sm outline-none focus:border-ink/40"
                  />

                  {startChatMode === 'group' && (
                    <div className="mt-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-ink/60 mb-1">Group name (optional)</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="e.g. Survey team"
                        className="w-full min-h-[44px] rounded-xl border border-ink/20 px-3 py-2 text-sm outline-none focus:border-ink/40"
                      />
                      {groupMembers.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {groupMembers.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => removeGroupMember(m.id)}
                              className="px-2.5 py-1.5 rounded-full border border-ink/20 bg-white text-xs text-ink/80 hover:bg-ink/5"
                              title="Remove"
                            >
                              {getDisplayName(m)} <span className="text-ink/40">×</span>
                            </button>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateGroup}
                        disabled={creatingGroup || groupMembers.length === 0}
                        className="mt-3 w-full rounded-xl bg-ink text-white py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        {creatingGroup ? 'Creating…' : 'Create group chat'}
                      </button>
                    </div>
                  )}

                  <div className="mt-3">
                    {peopleLoading ? (
                      <p className="text-sm text-ink/50 py-3 text-center">Searching…</p>
                    ) : peopleQuery.trim().length < 2 ? (
                      <p className="text-xs text-ink/50 py-2">Type at least 2 letters.</p>
                    ) : peopleResults.length === 0 ? (
                      <p className="text-xs text-ink/50 py-2">No matches.</p>
                    ) : (
                      <ul className="space-y-1">
                        {peopleResults.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => (startChatMode === 'dm' ? handleStartDm(p) : addGroupMember(p))}
                              disabled={startChatMode === 'dm' && creatingDmForUserId === p.id}
                              className="w-full text-left rounded-xl border border-ink/20 px-4 py-3 hover:bg-ink/5 hover:border-ink/30 transition-colors disabled:opacity-50"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-ink truncate">{getDisplayName(p)}</div>
                                  <div className="text-[11px] text-ink/50 truncate">{p.role || 'Member'}</div>
                                </div>
                                <div className="text-xs font-bold text-ink/60">
                                  {startChatMode === 'dm' ? (creatingDmForUserId === p.id ? 'Opening…' : 'Message') : (groupMembers.some((x) => x.id === p.id) ? 'Added' : 'Add')}
                                </div>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main: selected chatroom — Posts | Chat tabs */}
      <main
        className={`flex-1 flex flex-col min-w-0 min-h-0 ${
          isMobile ? (mobilePanel === 'room' ? 'flex' : 'hidden') : 'flex'
        }`}
      >
        {!selectedChatroomId ? (
          <div className="flex-1 flex items-center justify-center p-8 text-ink/60 text-sm">
            <div className="max-w-md text-center">
              <div className="text-base font-bold text-ink">Welcome to Social Hub</div>
              <p className="mt-1 text-sm text-ink/60">
                Start a direct message, create a group chat, or open a dig site room.
              </p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <button type="button" onClick={() => openStartChat('dm')} className="min-h-[44px] rounded-xl bg-ink text-white px-4 py-2.5 text-sm font-semibold hover:opacity-90">
                  Message someone
                </button>
                <button type="button" onClick={() => openStartChat('group')} className="min-h-[44px] rounded-xl border border-ink/20 bg-white/80 text-ink px-4 py-2.5 text-sm font-semibold hover:bg-ink/5">
                  Create a group
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="shrink-0 border-b-2 border-ink/20 bg-white/70 md:rounded-t-2xl md:border-t md:border-x md:border-ink/20">
              <div className="px-4 pt-3 pb-0 flex flex-wrap items-end gap-4 sm:gap-6 min-h-[52px]">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="md:hidden min-h-[44px] -ml-2 px-2 text-ink/70 hover:text-ink flex items-center gap-1.5"
                  aria-label="Back to Social Hub"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  <span className="text-xs font-bold uppercase tracking-wider">Social Hub</span>
                </button>
                <h3 className="font-bold text-ink truncate pb-2 border-b-2 border-transparent -mb-0.5 min-w-0">{selectedChatroom?.name ?? 'Chatroom'}</h3>
                <div className="flex gap-1 ml-0 sm:ml-2">
                  <button
                    type="button"
                    onClick={() => setTab('posts')}
                    className={`px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 -mb-0.5 transition-colors ${tab === 'posts' ? 'border-ink text-ink' : 'border-transparent text-ink/50 hover:text-ink/70 hover:border-ink/20'}`}
                  >
                    Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('chat')}
                    className={`px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-b-2 -mb-0.5 transition-colors ${tab === 'chat' ? 'border-ink text-ink' : 'border-transparent text-ink/50 hover:text-ink/70 hover:border-ink/20'}`}
                  >
                    Chat
                  </button>
                </div>
              </div>
            </div>

            {tab === 'posts' && (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="shrink-0 p-3 border-b border-ink/10 bg-white/40">
                  <form onSubmit={handleCreatePost} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Share an update with the team…"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/40 outline-none focus:border-ink/50"
                    />
                    <button type="submit" disabled={sendingPost || !newPostContent.trim()} className="shrink-0 rounded-lg bg-ink text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                      {sendingPost ? 'Posting…' : 'Post'}
                    </button>
                  </form>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {postsLoading ? (
                    <div className="py-8 text-center text-sm text-ink/50 animate-pulse">Loading posts…</div>
                  ) : posts.length === 0 ? (
                    <div className="py-12 text-center text-sm text-ink/50 rounded-xl border border-ink/10 border-dashed bg-ink/5">No posts yet. Be the first to share.</div>
                  ) : (
                    posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        likes={postLikesMap[post.id]}
                        onLike={() => handleLike(post.id)}
                        currentUserId={profile.id}
                        comments={commentsMap[post.id]}
                        commentsOpen={commentsOpen[post.id]}
                        onToggleComments={() => toggleComments(post.id)}
                        onAddComment={(content) => handleAddComment(post.id, content)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {tab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messagesLoading ? (
                    <div className="py-8 text-center text-sm text-ink/50 animate-pulse">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-ink/50">No messages yet. Say hello!</div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = profile && msg.sender_id === profile.id;
                      const displayProfile = msg.profiles ?? (isMe ? { full_name: profile.full_name, username: profile.username, avatar_url: profile.avatar_url, role: profile.role } : null);
                      const displayName = displayProfile?.full_name || displayProfile?.username || (isMe ? (profile?.full_name || profile?.username) : null) || 'Member';
                      const displayRole = displayProfile?.role || (isMe ? profile?.role : null);
                      return (
                      <div key={msg.id} className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-full bg-ink/10 shrink-0 overflow-hidden flex items-center justify-center ring-2 ring-white">
                          {(displayProfile?.avatar_url ?? (isMe && profile?.avatar_url)) ? (
                            <img src={displayProfile?.avatar_url || profile?.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-ink/60">{(displayName)[0]}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="rounded-2xl rounded-tl-md bg-ink/10 border border-ink/10 px-4 py-2.5 shadow-sm">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-xs font-bold text-ink">{displayName}</span>
                              {displayRole && (
                                <span className="text-[10px] text-ink/50 font-medium">· {displayRole}</span>
                              )}
                              <span className="text-[10px] text-ink/40">{formatTime(msg.created_at)}</span>
                            </div>
                            <p className="text-sm text-ink/90 mt-1 break-words leading-snug">{msg.content}</p>
                          </div>
                        </div>
                      </div>
                    ); })
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="shrink-0 p-3 border-t border-ink/20 bg-white/60">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message…"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.target.value)}
                      className="flex-1 min-w-0 rounded-lg border border-ink/20 px-3 py-2 text-sm text-ink placeholder-ink/40 outline-none focus:border-ink/50"
                    />
                    <button type="submit" disabled={sendingMessage || !newMessageContent.trim()} className="shrink-0 rounded-lg bg-ink text-white px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50">
                      Send
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function PostCard({ post, likes, onLike, currentUserId, comments, commentsOpen, onToggleComments, onAddComment }) {
  const [commentText, setCommentText] = useState('');
  const author = post.profiles || {};
  const likeCount = likes?.count ?? 0;
  const liked = likes?.liked ?? false;
  const commentList = comments || [];

  return (
    <article className="rounded-xl border border-ink/10 bg-white shadow-[0_2px_8px_rgba(44,40,37,0.06)] overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink/10 shrink-0 overflow-hidden flex items-center justify-center">
              {author.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-medium text-ink/60">{(author.full_name || author.username || '?')[0]}</span>}
            </div>
            <div>
              <span className="text-sm font-semibold text-ink">{author.full_name || author.username || 'Unknown'}</span>
              <span className="text-[10px] text-ink/50 block">{formatTime(post.created_at)}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-ink/80 mt-3 whitespace-pre-wrap break-words">{post.content}</p>
        {post.image_url && <img src={post.image_url} alt="" className="mt-3 rounded-lg max-w-full h-auto max-h-64 object-cover" />}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <button type="button" onClick={onLike} className={`flex items-center gap-1 ${liked ? 'text-red-600' : 'text-ink/50 hover:text-ink/70'}`}>
            <span aria-hidden>{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          <button type="button" onClick={onToggleComments} className="text-ink/50 hover:text-ink/70 flex items-center gap-1">
            <span aria-hidden>💬</span>
            <span>{commentList.length}</span>
          </button>
        </div>
      </div>
      {commentsOpen && (
        <div className="border-t border-ink/10 bg-ink/5 p-4 space-y-3">
          {commentList.map((c) => (
            <div key={c.id} className="flex gap-2">
              <span className="text-xs font-medium text-ink shrink-0">{c.profiles?.full_name || c.profiles?.username || '?'}:</span>
              <span className="text-xs text-ink/80">{c.content}</span>
              <span className="text-[10px] text-ink/40 ml-auto shrink-0">{formatTime(c.created_at)}</span>
            </div>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); onAddComment(commentText); setCommentText(''); }} className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-ink/20 px-2 py-1.5 text-xs outline-none focus:border-ink/40"
            />
            <button type="submit" className="shrink-0 rounded bg-ink text-white px-2 py-1.5 text-xs font-medium">Reply</button>
          </form>
        </div>
      )}
    </article>
  );
}

function formatTime(iso) {
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
