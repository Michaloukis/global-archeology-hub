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
  const [newJournalImageFile, setNewJournalImageFile] = useState(null);
  const [newJournalModelFile, setNewJournalModelFile] = useState(null);
  const [isJournalPublic, setIsJournalPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit State
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editFindings, setEditFindings] = useState('');
  const [editMapping, setEditMapping] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editModelUrl, setEditModelUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editModelFile, setEditModelFile] = useState(null);
  const [editIsPublic, setEditIsPublic] = useState(true);
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
      const payload = {
        site_id: siteId,
        user_id: profile.id,
        notes: newJournalNotes,
        findings: newJournalFindings,
        mapping_data: newJournalMapping,
        image_url: imageUrl,
        model_url: modelUrl,
        is_public: isJournalPublic
      };
      const { error } = await supabase.from('site_journals').insert([payload]);
      if (error) throw error;
      setNewJournalNotes('');
      setNewJournalFindings('');
      setNewJournalMapping('');
      setNewJournalImageFile(null);
      setNewJournalModelFile(null);
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
      const { error } = await supabase
        .from('site_journals')
        .update({
          notes: editNotes,
          findings: editFindings,
          mapping_data: editMapping,
          image_url: imageUrl || null,
          model_url: modelUrl || null,
          is_public: editIsPublic
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
    setEditImageUrl(entry.image_url || '');
    setEditModelUrl(entry.model_url || '');
    setEditImageFile(null);
    setEditModelFile(null);
    setEditIsPublic(entry.is_public !== false);
  };

  if (!site || !profile) return (
    <div className="p-20 text-center space-y-6">
      <div className="font-black uppercase tracking-[0.5em] animate-pulse text-2xl">Establishing Geospatial Connection...</div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {!site ? 'Linking with Satellite Registry...' : 'Verifying Personnel Credentials...'}
      </p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="border-b-4 border-black pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase tracking-tighter italic text-red-600">FIELD TERMINAL // {site.name}</h2>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-widest">Global Site ID: {site.id} // Personnel: {profile?.full_name || 'AUTHENTICATING...'}</p>
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
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500 block">Photo / image</label>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => setNewJournalImageFile(e.target.files?.[0] || null)}
                className="w-full border-2 border-black p-2 text-[10px] file:mr-2 file:border-0 file:bg-black file:text-white file:text-[9px] file:uppercase file:font-black file:px-3 file:py-1 file:cursor-pointer"
              />
              {newJournalImageFile && <span className="text-[9px] font-bold text-gray-500 uppercase">{newJournalImageFile.name}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-500 block">3D model (GLB, GLTF, OBJ, FBX, STL, etc.)</label>
              <input
                type="file"
                accept={MODEL_3D_ACCEPT}
                onChange={(e) => setNewJournalModelFile(e.target.files?.[0] || null)}
                className="w-full border-2 border-black p-2 text-[10px] file:mr-2 file:border-0 file:bg-black file:text-white file:text-[9px] file:uppercase file:font-black file:px-3 file:py-1 file:cursor-pointer"
              />
              {newJournalModelFile && <span className="text-[9px] font-bold text-gray-500 uppercase">{newJournalModelFile.name}</span>}
            </div>
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
            {submitError && <p className="text-[10px] font-black uppercase text-red-600">{submitError}</p>}
            <button
              disabled={isSubmitting}
              className="w-full bg-red-600 text-white py-3 text-xs font-black uppercase hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'UPLOADING & REGISTERING...' : 'Register Entry'}
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
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-gray-500">Replace image</span>
                        <input
                          type="file"
                          accept={IMAGE_ACCEPT}
                          onChange={(e) => { setEditImageFile(e.target.files?.[0] || null); }}
                          className="w-full border-2 border-black p-2 text-[10px] file:mr-2 file:border-0 file:bg-black file:text-white file:text-[9px] file:uppercase file:font-black file:px-2 file:py-1"
                        />
                        {editImageUrl && !editImageFile && <span className="text-[8px] text-gray-500 uppercase">Current image attached</span>}
                      </div>
                      <div className="space-y-1">
                        <span className="text-[8px] font-black uppercase text-gray-500">Replace 3D model</span>
                        <input
                          type="file"
                          accept={MODEL_3D_ACCEPT}
                          onChange={(e) => { setEditModelFile(e.target.files?.[0] || null); }}
                          className="w-full border-2 border-black p-2 text-[10px] file:mr-2 file:border-0 file:bg-black file:text-white file:text-[9px] file:uppercase file:font-black file:px-2 file:py-1"
                        />
                        {editModelUrl && !editModelFile && <span className="text-[8px] text-gray-500 uppercase">Current model attached</span>}
                      </div>
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
                      {submitError && <p className="text-[10px] font-black uppercase text-red-600">{submitError}</p>}
                      <div className="flex gap-2">
                        <button type="submit" disabled={isUpdating} className="flex-1 bg-black text-white py-2 text-[10px] uppercase font-black disabled:opacity-50">{isUpdating ? '...' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingEntryId(null)} className="flex-1 border-2 border-black py-2 text-[10px] uppercase font-black">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.user_id === profile?.id && (
                            <button onClick={() => startEditing(entry)} className="text-[8px] font-black text-red-600 hover:underline uppercase">[Modify]</button>
                          )}
                          {!entry.is_public && (
                            <span className="text-[7px] font-black bg-gray-200 px-1 text-gray-500 uppercase">INTERNAL_ONLY</span>
                          )}
                        </div>
                        <span className="bg-black text-white text-[7px] px-1.5 py-0.5 uppercase">ID_{entry.id}</span>
                      </div>
                      {entry.image_url && <img src={entry.image_url} alt="Field evidence" className="w-full h-32 object-cover border border-black grayscale hover:grayscale-0 transition-all" />}
                      {entry.model_url && (
                        <a href={entry.model_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-black px-3 py-1.5 text-[9px] font-black uppercase hover:bg-black hover:text-white transition-all">
                          View 3D model ↗
                        </a>
                      )}
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

