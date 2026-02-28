/** Minimal valid profile: base and rim. */
const defaultProfile = [
  { x: 0.05, y: 0 },
  { x: 0.3, y: 0.5 },
  { x: 0.25, y: 1 },
];

export function createDefaultSpec(id) {
  return {
    id: id ?? `sculpture-${Date.now()}`,
    label: 'New sculpture',
    form: 'pot',
    profile: defaultProfile.map((p) => ({ ...p })),
    wallThickness: 0.05,
    decorationBands: [],
    isFragment: false,
    breakLines: [],
  };
}
