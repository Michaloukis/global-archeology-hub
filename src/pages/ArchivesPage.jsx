import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const ArchivesPage = ({ profile, onBack }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('auto'); // auto | mine | all

  const isChief = profile?.role === 'Director';
  const isFieldArch = profile?.role === 'Field Archeologist';

  useEffect(() => {
    if (!profile?.id) return;
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role, roleFilter]);

  async function fetchEntries() {
    setLoading(true);
    setError('');
    try {
      const base = supabase.from('site_journals').select(
        'id, site_id, notes, findings, created_at, sites(name), profiles:user_id(full_name)'
      );

      let query = base;

      // Auto mode: field archeologists see their own, chiefs see all.
      if (roleFilter === 'mine' || (roleFilter === 'auto' && isFieldArch)) {
        query = query.eq('user_id', profile.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('Error loading archives', err);
      setError('Unable to load archive records right now.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const site = e.sites?.name?.toLowerCase() || '';
    const notes = (e.notes || '').toLowerCase();
    const findings = (e.findings || '').toLowerCase();
    const author = e.profiles?.full_name?.toLowerCase() || '';
    return (
      site.includes(q) ||
      notes.includes(q) ||
      findings.includes(q) ||
      author.includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-ink/80 hover:text-ink text-sm font-medium"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Arch Zone
            </button>
          )}
        </div>
        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-bold text-ink">
            Expedition Archives
          </h1>
          <p className="text-xs text-ink/60 mt-0.5">
            Field journals and findings from registered sites.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2 rounded-xl bg-white border border-ink/20 px-3 py-2 shadow-sm">
            <svg
              className="w-4 h-4 text-ink/50 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by site, notes, or author"
              className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder-ink/50 outline-none"
            />
          </div>
        </div>
        {(isChief || isFieldArch) && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-ink/60">View:</span>
            <div className="inline-flex rounded-xl border border-ink/20 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter('auto')}
                className={`px-2.5 py-1 rounded-lg font-medium ${
                  roleFilter === 'auto'
                    ? 'bg-ink text-white'
                    : 'text-ink/70 hover:bg-ink/5'
                }`}
              >
                Smart
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('mine')}
                className={`px-2.5 py-1 rounded-lg font-medium ${
                  roleFilter === 'mine'
                    ? 'bg-ink text-white'
                    : 'text-ink/70 hover:bg-ink/5'
                }`}
              >
                My records
              </button>
              {isChief && (
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium hidden sm:inline-flex ${
                    roleFilter === 'all'
                      ? 'bg-ink text-white'
                      : 'text-ink/70 hover:bg-ink/5'
                  }`}
                >
                  All
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(44,40,37,0.08)] border border-ink/10 p-4 sm:p-5 flex flex-col min-h-[220px]">
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-ink/60 animate-pulse">
              Loading archive records…
            </p>
          </div>
        )}
        {!loading && error && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-ink/50">
              No archive records match your filters yet.
            </p>
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  window.open(`/?view=journal&siteId=${entry.site_id}`, '_blank')
                }
                className="w-full text-left rounded-xl border border-ink/15 bg-white hover:bg-ink/5 transition-colors p-3 sm:p-4"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink/10 text-[11px] font-semibold text-ink shrink-0">
                      {entry.sites?.name?.[0] || 'S'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">
                        {entry.sites?.name || 'Site'}
                      </p>
                      {entry.profiles?.full_name && (
                        <p className="text-[11px] text-ink/60 truncate">
                          {entry.profiles.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-ink/50 shrink-0">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-ink/70 mt-1 line-clamp-3">
                  {entry.findings || entry.notes || 'No description recorded.'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivesPage;

