import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Storage bucket for field record assets (create in Supabase Dashboard and set to public)
const STORAGE_BUCKET = 'field-records';

// Accepted file types: images and common 3D model formats
const IMAGE_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp';
const MODEL_3D_ACCEPT = '.glb,.gltf,.obj,.fbx,.stl,.dae,.3ds,.ply';

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function uploadToStorage(siteId, userId, file, folder) {
  if (!supabase) throw new Error('Storage not available');
  const ext = file.name.split('.').pop() || 'bin';
  const base = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ''));
  const path = `sites/${siteId}/${userId}/${Date.now()}_${base}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return publicUrl;
}

const JournalTerminal = ({ siteId, profile }) => {
  const [site, setSite] = useState(null);
  const [journals, setJournals] = useState([]);
  const [isJournalLoading, setIsJournalLoading] = useState(false);
  const [newJournalNotes, setNewJournalNotes] = useState('');
  const [newJournalFindings, setNewJournalFindings] = useState('');
  const [newJournalMapping, setNewJournalMapping] = useState('');
  const [newJournalLat, setNewJournalLat] = useState('');
  const [newJournalLng, setNewJournalLng] = useState('');
  const [newJournalImageFile, setNewJournalImageFile] = useState(null);
  const [newJournalModelFile, setNewJournalModelFile] = useState(null);
  const [newJournalVisibility, setNewJournalVisibility] = useState('public'); // 'private' | 'team' | 'public'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit State
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFindings, setEditFindings] = useState('');
  const [editMapping, setEditMapping] = useState('');
  const [editLat, setEditLat] = useState('');
  const [editLng, setEditLng] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editModelUrl, setEditModelUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editModelFile, setEditModelFile] = useState(null);
  const [editVisibility, setEditVisibility] = useState('public');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (siteId) {
      fetchSite();
      fetchJournals();
    }
  }, [siteId, profile?.id]);

  async function fetchSite() {
    const { data, error } = await supabase.from('sites').select('*').eq('id', siteId).single();
    if (data) setSite(data);
  }

  async function fetchJournals() {
    if (!profile?.id) return; // 🛡️ GUARD: Don't fetch if profile isn't ready
    setIsJournalLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_journals')
        .select('*')
        .eq('site_id', siteId)
        .eq('user_id', profile.id) // 🔒 PRIVACY LOCK
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
    if (!profile?.id) return;
    setSubmitError('');
    setIsSubmitting(true);
    try {
      let imageUrl = null;
      let modelUrl = null;
      if (newJournalImageFile) {
        imageUrl = await uploadToStorage(siteId, profile.id, newJournalImageFile, 'images');
      }
      if (newJournalModelFile) {
        modelUrl = await uploadToStorage(siteId, profile.id, newJournalModelFile, 'models');
      }
      const latVal = newJournalLat.trim() ? parseFloat(newJournalLat) : null;
      const lngVal = newJournalLng.trim() ? parseFloat(newJournalLng) : null;
      const payload = {
        site_id: siteId,
        user_id: profile.id,
        notes: newJournalNotes,
        findings: newJournalFindings,
        mapping_data: newJournalMapping,
        lat: latVal,
        lng: lngVal,
        image_url: imageUrl,
        model_url: modelUrl,
        is_public: newJournalVisibility === 'public',
        visibility: newJournalVisibility
      };
      const { error } = await supabase.from('site_journals').insert([payload]);
      if (error) throw error;
      setNewJournalNotes('');
      setNewJournalFindings('');
      setNewJournalMapping('');
      setNewJournalLat('');
      setNewJournalLng('');
      setNewJournalImageFile(null);
      setNewJournalModelFile(null);
      setNewJournalVisibility('public');
      fetchJournals();
    } catch (error) {
      console.error('Error adding entry:', error);
      setSubmitError(error?.message || 'Upload or save failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateJournalEntry(e) {
    e.preventDefault();
    setIsUpdating(true);
    setSubmitError('');
    try {
      let imageUrl = editImageUrl;
      let modelUrl = editModelUrl;
      if (editImageFile) {
        imageUrl = await uploadToStorage(siteId, profile.id, editImageFile, 'images');
      }
      if (editModelFile) {
        modelUrl = await uploadToStorage(siteId, profile.id, editModelFile, 'models');
      }
      const latVal = editLat.trim() ? parseFloat(editLat) : null;
      const lngVal = editLng.trim() ? parseFloat(editLng) : null;
      const { error } = await supabase
        .from('site_journals')
        .update({
          notes: editNotes,
          findings: editFindings,
          mapping_data: editMapping,
          lat: latVal,
          lng: lngVal,
          image_url: imageUrl || null,
          model_url: modelUrl || null,
          is_public: editVisibility === 'public',
          visibility: editVisibility
        })
        .eq('id', editingEntryId);

      if (error) throw error;
      setEditingEntryId(null);
      fetchJournals();
    } catch (error) {
      console.error('Error updating entry:', error);
      setSubmitError(error?.message || 'Update failed.');
    } finally {
      setIsUpdating(false);
    }
  }

  const startEditing = (entry) => {
    setEditingEntryId(entry.id);
    setEditNotes(entry.notes || '');
    setEditFindings(entry.findings || '');
    setEditMapping(entry.mapping_data || '');
    setEditLat(entry.lat != null ? String(entry.lat) : '');
    setEditLng(entry.lng != null ? String(entry.lng) : '');
    setEditImageUrl(entry.image_url || '');
    setEditModelUrl(entry.model_url || '');
    setEditImageFile(null);
    setEditModelFile(null);
    setEditVisibility(entry.visibility || (entry.is_public !== false ? 'public' : 'private'));
  };

  if (!site || !profile) return (
    <div className="p-12 text-center space-y-3">
      <p className="text-sm font-medium text-ink animate-pulse">Loading field terminal…</p>
      <p className="text-xs text-ink/50">
        {!site ? 'Loading site…' : 'Verifying credentials…'}
      </p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-wrap justify-between items-start gap-4 border-b border-ink/20 pb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink">Field Terminal — {site.name}</h2>
          <p className="text-xs text-ink/60 mt-1">Site ID: {site.id} · {profile?.full_name || 'Loading…'}</p>
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-xl border border-ink/20 text-ink px-4 py-2.5 text-sm font-medium hover:bg-ink/5 min-h-[44px]"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-base font-bold text-ink">Add Field Record</h3>
          <form onSubmit={handleAddJournalEntry} className="space-y-4 bg-white rounded-2xl border border-ink/10 shadow-[0_2px_12px_rgba(44,40,37,0.08)] p-5 sm:p-6">
            <div>
              <label className="text-xs font-medium text-ink/70 block mb-1">Stratigraphy / observations</label>
              <textarea
                value={newJournalNotes}
                onChange={(e) => setNewJournalNotes(e.target.value)}
                placeholder="Notes and observations…"
                className="w-full h-32 rounded-xl border border-ink/20 p-3 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-ink/70 block mb-1">Findings</label>
                <input
                  type="text"
                  value={newJournalFindings}
                  onChange={(e) => setNewJournalFindings(e.target.value)}
                  placeholder="Findings…"
                  className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/70 block mb-1">Mapping URL</label>
                <input
                  type="text"
                  value={newJournalMapping}
                  onChange={(e) => setNewJournalMapping(e.target.value)}
                  placeholder="Mapping URL…"
                  className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-ink/70 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={newJournalLat}
                  onChange={(e) => setNewJournalLat(e.target.value)}
                  placeholder="e.g. 29.9792"
                  className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-ink/70 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={newJournalLng}
                  onChange={(e) => setNewJournalLng(e.target.value)}
                  placeholder="e.g. 31.1342"
                  className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink placeholder-ink/50 outline-none focus:ring-2 focus:ring-ink/20"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70 block mb-1">Photo / image</label>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => setNewJournalImageFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-medium file:px-3 file:py-1.5 file:cursor-pointer"
              />
              {newJournalImageFile && <span className="text-xs text-ink/60 mt-1 block">{newJournalImageFile.name}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70 block mb-1">3D model (GLB, GLTF, OBJ, etc.)</label>
              <input
                type="file"
                accept={MODEL_3D_ACCEPT}
                onChange={(e) => setNewJournalModelFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-medium file:px-3 file:py-1.5 file:cursor-pointer"
              />
              {newJournalModelFile && <span className="text-xs text-ink/60 mt-1 block">{newJournalModelFile.name}</span>}
            </div>
            <div>
              <label className="text-xs font-medium text-ink/70 block mb-1">Visibility</label>
              <select
                value={newJournalVisibility}
                onChange={(e) => setNewJournalVisibility(e.target.value)}
                className="w-full rounded-xl border border-ink/20 p-2.5 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
              >
                <option value="private">Private (Exclusive Map only)</option>
                <option value="team">Team (Students & personnel)</option>
                <option value="student">Student (students & archeologists)</option>
                <option value="public">Public (everyone)</option>
              </select>
            </div>
            {submitError && <p className="text-xs font-medium text-rose-600">{submitError}</p>}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-ink text-white py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {isSubmitting ? 'Uploading…' : 'Register entry'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-bold text-ink">Site archive</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {isJournalLoading ? (
              <div className="p-8 rounded-2xl border border-ink/20 border-dashed text-center text-sm text-ink/50 animate-pulse">Loading records…</div>
            ) : journals.length === 0 ? (
              <div className="p-8 rounded-2xl border border-ink/20 border-dashed text-center text-sm text-ink/50 bg-ink/5">No logs on record yet.</div>
            ) : (
              journals.map(entry => (
                <div key={entry.id} className="bg-white rounded-2xl border border-ink/10 shadow-[0_2px_12px_rgba(44,40,37,0.08)] p-4 sm:p-5 space-y-4">
                  {editingEntryId === entry.id ? (
                    <form onSubmit={handleUpdateJournalEntry} className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-ink/70 block mb-1">Notes</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full h-24 rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input value={editFindings} onChange={(e) => setEditFindings(e.target.value)} placeholder="Findings" className="rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                        <input value={editMapping} onChange={(e) => setEditMapping(e.target.value)} placeholder="Mapping URL" className="rounded-xl border border-ink/20 p-2.5 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-ink/60 block mb-0.5">Lat</label>
                          <input type="number" step="any" value={editLat} onChange={(e) => setEditLat(e.target.value)} placeholder="29.9792" className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-ink/60 block mb-0.5">Lng</label>
                          <input type="number" step="any" value={editLng} onChange={(e) => setEditLng(e.target.value)} placeholder="31.1342" className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink outline-none focus:ring-2 focus:ring-ink/20" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-ink/60 block mb-0.5">Replace image</label>
                        <input
                          type="file"
                          accept={IMAGE_ACCEPT}
                          onChange={(e) => { setEditImageFile(e.target.files?.[0] || null); }}
                          className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-medium file:px-2 file:py-1 file:cursor-pointer"
                        />
                        {editImageUrl && !editImageFile && <span className="text-[10px] text-ink/50 mt-0.5 block">Current image attached</span>}
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-ink/60 block mb-0.5">Replace 3D model</label>
                        <input
                          type="file"
                          accept={MODEL_3D_ACCEPT}
                          onChange={(e) => { setEditModelFile(e.target.files?.[0] || null); }}
                          className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink file:mr-2 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-medium file:px-2 file:py-1 file:cursor-pointer"
                        />
                        {editModelUrl && !editModelFile && <span className="text-[10px] text-ink/50 mt-0.5 block">Current model attached</span>}
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-ink/60 block mb-0.5">Visibility</label>
                        <select
                          value={editVisibility}
                          onChange={(e) => setEditVisibility(e.target.value)}
                          className="w-full rounded-xl border border-ink/20 p-2 text-sm text-ink bg-white outline-none focus:ring-2 focus:ring-ink/20"
                        >
                          <option value="private">Private</option>
                          <option value="team">Team</option>
                          <option value="student">Student</option>
                          <option value="public">Public</option>
                        </select>
                      </div>
                      {submitError && <p className="text-xs font-medium text-rose-600">{submitError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={isUpdating} className="flex-1 rounded-xl bg-ink text-white py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 min-h-[44px]">{isUpdating ? 'Saving…' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="flex-1 rounded-xl border border-ink/20 text-ink py-2.5 text-sm font-medium hover:bg-ink/5 min-h-[44px]">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-ink/10 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] text-ink/60">{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.user_id === profile?.id && (
                            <button type="button" onClick={() => startEditing(entry)} className="text-xs font-medium text-ink/80 hover:text-ink hover:underline">Edit</button>
                          )}
                          {!entry.is_public && (
                            <span className="text-[10px] font-medium text-ink/60 bg-ink/10 px-1.5 py-0.5 rounded">Internal only</span>
                          )}
                        </div>
                        <span className="text-[10px] text-ink/50">#{String(entry.id).slice(-6)}</span>
                      </div>
                      {entry.image_url && <img src={entry.image_url} alt="Field evidence" className="w-full h-32 object-cover rounded-xl border border-ink/10 grayscale hover:grayscale-0 transition-all" />}
                      {entry.model_url && (
                        <a href={entry.model_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-ink/20 px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5 transition-colors">
                          View 3D model ↗
                        </a>
                      )}
                      <p className="text-sm text-ink leading-relaxed">{entry.notes || '—'}</p>
                      {entry.findings && <p className="text-xs font-medium text-ink/80">Findings: {entry.findings}</p>}
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

