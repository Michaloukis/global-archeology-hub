export function normalizeRole(role) {
  if (!role) return '';
  const r = String(role).trim().toLowerCase().replace(/\\s+/g, ' ');
  // Handle plural variants like "Directors" / "Field Archeologists"
  return r.endsWith('s') ? r.slice(0, -1) : r;
}

export function isDirector(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role;
  return normalizeRole(role) === 'director';
}

export function isFieldArcheologist(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role;
  const r = normalizeRole(role);
  return r === 'field archeologist' || r === 'field archaeologist';
}

export function isArcheologist(profileOrRole) {
  const role = typeof profileOrRole === 'string' ? profileOrRole : profileOrRole?.role;
  const r = normalizeRole(role);
  return r === 'director' || r === 'field archeologist' || r === 'field archaeologist' || r === 'chief archeologist' || r === 'chief archaeologist';
}

