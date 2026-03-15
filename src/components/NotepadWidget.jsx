import { useState, useEffect, useRef } from 'react';
import { STORAGE_KEY_NOTEPAD } from './EducationZone';

export default function NotepadWidget({ profile }) {
  const storageKey = `${STORAGE_KEY_NOTEPAD}_${profile?.id || 'anon'}`;
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || '';
    } catch {
      return '';
    }
  });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setValue(raw || '');
    } catch (_) {}
  }, [storageKey]);

  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, value || '');
      } catch (_) {}
      saveTimeoutRef.current = null;
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [storageKey, value]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <h3 className="text-xs font-bold text-ink border-b border-ink/30 pb-1.5 mb-2 shrink-0">
        Quick notes
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Jot down ideas, terms, or reminders… (synced with Edu Lab notepad)"
        className="flex-1 min-h-0 w-full resize-none rounded-lg border border-ink/20 bg-white/70 px-2.5 py-2 text-[11px] text-ink placeholder-ink/40 outline-none focus:border-ink/40 focus:ring-1 focus:ring-ink/20"
        rows={4}
      />
    </div>
  );
}
