import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listTeamsForUser } from '../services/teamsApi';

export default function TeamWidget({ profile }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) {
      setTeams([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const isDirector = profile?.role === 'Director';
    listTeamsForUser({ userId: profile.id, isDirector })
      .then((data) => {
        if (!cancelled) setTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setTeams([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [profile?.id, profile?.role]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between border-b border-ink/30 pb-1 mb-1.5 shrink-0">
        <h3 className="text-[11px] font-bold text-ink">Teams</h3>
        <Link to="/teams" className="text-[9px] font-medium text-ink/70 hover:text-ink">View all →</Link>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {loading ? (
          <p className="text-[9px] text-ink/50 animate-pulse py-1.5">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-[9px] text-ink/50 py-1.5">No teams yet. Join or create one from the Teams page.</p>
        ) : (
          teams.slice(0, 6).map((team) => (
            <Link
              key={team.id}
              to="/teams"
              className="block w-full text-left rounded border border-ink/15 bg-white/60 hover:bg-ink/5 hover:border-ink/25 px-1.5 py-1 transition-colors"
            >
              <p className="text-[9px] font-medium text-ink/90 truncate">{team.name || 'Unnamed team'}</p>
              {team.visibility && (
                <p className="text-[8px] text-ink/50 mt-0.5 capitalize">{team.visibility}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
