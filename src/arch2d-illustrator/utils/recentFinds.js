/**
 * Recently edited sculptures — persisted in localStorage.
 * Add when user saves/exports; show in gallery.
 */

const STORAGE_KEY = 'arch2d-recent-finds';
const MAX_RECENT = 20;

const VALID_FORMS = ['pitcher', 'bowl', 'cup', 'pot', 'jar', 'goblet', 'fragment'];

function isValidSpec(s) {
  if (typeof s !== 'object' || s === null) return false;
  const o = s;
  if (typeof o.id !== 'string') return false;
  if (!VALID_FORMS.includes(o.form)) return false;
  if (!Array.isArray(o.profile) || o.profile.length < 2) return false;
  if (!o.profile.every((p) => {
    if (typeof p !== 'object' || p === null) return false;
    return typeof p.x === 'number' && typeof p.y === 'number';
  })) return false;
  if (!Array.isArray(o.decorationBands)) return false;
  return true;
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidSpec);
  } catch {
    return [];
  }
}

function save(specs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(specs));
  } catch {
    // ignore quota / private mode
  }
}

/** Get recently edited finds (most recent first). */
export function getRecentFinds() {
  return load();
}

/** Add or update a sculpture in recent list (by id). Moves to front; limits to MAX_RECENT. */
export function addRecentFind(spec) {
  const list = load();
  const next = list.filter((s) => s.id !== spec.id);
  next.unshift(JSON.parse(JSON.stringify(spec)));
  save(next.slice(0, MAX_RECENT));
}

/** Remove a sculpture from the recent list by id. */
export function removeRecentFind(id) {
  const list = load().filter((s) => s.id !== id);
  save(list);
}
