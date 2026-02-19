import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const JournalTerminal = ({ siteId, profile }) => {
  const [site, setSite] = useState(null);
  const [journals, setJournals] = useState([]);
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [newJournalNotes, setNewJournalNotes] = useState('');
  const [newJournalFindings, setNewJournalFindings] = useState('');
  const [newJournalMapping, setNewJournalMapping] = useState('');
  const [newJournalImageUrl, setNewJournalImageUrl] = useState('');
  const [isJournalPublic, setIsJournalPublic] = useState(true);

  // Edit State
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFindings, setEditFindings] = useState('');
  const [editMapping, setEditMapping] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (siteId) {
      fetchSite();
      fetchJournals();
    }
  }, [siteId]);

  async function fetchSite() {
    const { data, error } = await supabase.from('sites').select('*').eq('id', siteId).single();
    if (data) setSite(data);
  }

  async function fetchJournals() {
    setIsJournalLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_journals')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setIsJournalLoading(false);
    }
  }

  async function handleAddJournalEntry(e) {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('site_journals')
        .insert([{
          site_id: siteId,
          user_id: profile.id,
          notes: newJournalNotes,
          findings: newJournalFindings,
          mapping_data: newJournalMapping,
          image_url: newJournalImageUrl,
          is_public: isJournalPublic
        }]);

      if (error) throw error;
      setNewJournalNotes('');
      setNewJournalFindings('');
      setNewJournalMapping('');
      setNewJournalImageUrl('');
      fetchJournals();
    } catch (error) {
      console.error('Error adding entry:', error);
    }
  }

  async function handleUpdateJournalEntry(e) {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('site_journals')
        .update({
          notes: editNotes,
          findings: editFindings,
          mapping_data: editMapping,
          image_url: editImageUrl,
          is_public: editIsPublic
        })
        .eq('id', editingEntryId);

      if (error) throw error;
      setEditingEntryId(null);
      fetchJournals();
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setIsUpdating(false);
    }
  }

  const startEditing = (entry) => {
    setEditingEntryId(entry.id);
    setEditNotes(entry.notes || '');
    setEditFindings(entry.findings || '');
    setEditMapping(entry.mapping_data || '');
    setEditImageUrl(entry.image_url || '');
    setEditIsPublic(entry.is_public !== false);
  };

  if (!site) return <div className="p-20 text-center font-black uppercase tracking-widest animate-pulse">Establishing Geospatial Connection...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="border-b-4 border-black pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-red-600">FIELD TERMINAL // {site.name}</h2>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">Global Site ID: {site.id} // Personnel: {profile?.full_name}</p>
        </div>
        <button onClick={() => window.close()} className="bg-black text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[4px_4px_0px_rgba(220,38,38,1)]">
          DISCONNECT [X]
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Add Field Record</h3>
          <form onSubmit={handleAddJournalEntry} className="space-y-4 bg-gray-50 p-6 border-2 border-black">
            <textarea
              value={newJournalNotes}
              onChange={(e) => setNewJournalNotes(e.target.value)}
              placeholder="STRATIGRAPHY / OBSERVATIONS..."
              className="w-full h-32 border-2 border-black p-3 text-xs font-bold uppercase outline-none focus:bg-white resize-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={newJournalFindings}
                onChange={(e) => setNewJournalFindings(e.target.value)}
                placeholder="FINDINGS..."
                className="w-full border-2 border-black p-2 text-xs font-bold uppercase outline-none focus:bg-white"
              />
              <input
                type="text"
                value={newJournalMapping}
                onChange={(e) => setNewJournalMapping(e.target.value)}
                placeholder="MAPPING URL..."
                className="w-full border-2 border-black p-2 text-xs font-bold outline-none focus:bg-white"
              />
            </div>
            <input
              type="text"
              value={newJournalImageUrl}
              onChange={(e) => setNewJournalImageUrl(e.target.value)}
              placeholder="IMAGE URL..."
              className="w-full border-2 border-black p-2 text-xs font-bold outline-none focus:bg-white"
            />
            <div className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                id="is_public_new"
                checked={isJournalPublic}
                onChange={(e) => setIsJournalPublic(e.target.checked)}
                className="w-4 h-4 border-2 border-black accent-red-600 cursor-pointer"
              />
              <label htmlFor="is_public_new" className="text-[9px] font-black uppercase cursor-pointer">
                Publish to "Last Dispatch" Feed? (Visible to Students & Map)
              </label>
            </div>
            <button className="w-full bg-red-600 text-white py-3 text-xs font-black uppercase hover:bg-black transition-all">
              Register Entry
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase border-l-4 border-black pl-4">Site Archive</h3>
          <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
            {journals.length === 0 ? (
              <div className="p-8 border-2 border-black border-dashed text-center font-black uppercase text-xs text-gray-400">No logs on record.</div>
            ) : (
              journals.map(entry => (
                <div key={entry.id} className="bg-white border-2 border-black p-5 space-y-4">
                  {editingEntryId === entry.id ? (
                    <form onSubmit={handleUpdateJournalEntry} className="space-y-4">
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="w-full h-24 border-2 border-black p-2 text-[10px] font-bold uppercase outline-none"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editFindings} onChange={(e) => setEditFindings(e.target.value)} className="border-2 border-black p-2 text-[10px] uppercase" />
                        <input value={editMapping} onChange={(e) => setEditMapping(e.target.value)} className="border-2 border-black p-2 text-[10px]" />
                      </div>
                      <input value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} className="w-full border-2 border-black p-2 text-[10px]" />
                      <div className="flex items-center gap-3 py-2">
                        <input
                          type="checkbox"
                          id="edit_is_public"
                          checked={editIsPublic}
                          onChange={(e) => setEditIsPublic(e.target.checked)}
                          className="w-4 h-4 border-2 border-black accent-red-600 cursor-pointer"
                        />
                        <label htmlFor="edit_is_public" className="text-[9px] font-black uppercase cursor-pointer">
                          Visible as "Last Dispatch"?
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-black text-white py-2 text-[10px] uppercase font-black">{isUpdating ? '...' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="flex-1 border-2 border-black py-2 text-[10px] uppercase font-black">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.user_id === profile.id && (
                            <button onClick={() => startEditing(entry)} className="text-[8px] font-black text-red-600 hover:underline uppercase">[Modify]</button>
                          )}
                          {!entry.is_public && (
                            <span className="text-[7px] font-black bg-gray-200 px-1 text-gray-500 uppercase">INTERNAL_ONLY</span>
                          )}
                        </div>
                        <span className="bg-black text-white text-[7px] px-1.5 py-0.5 uppercase">ID_{entry.id}</span>
                      </div>
                      {entry.image_url && <img src={entry.image_url} className="w-full h-32 object-cover border border-black grayscale hover:grayscale-0 transition-all" />}
                      <p className="text-[11px] font-bold uppercase leading-relaxed">{entry.notes}</p>
                      {entry.findings && <div className="text-[9px] font-black text-red-600 uppercase">Recovered: {entry.findings}</div>}
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalTerminal;

