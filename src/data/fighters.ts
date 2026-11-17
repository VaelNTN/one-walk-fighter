export interface FighterSkin {
  id: number;
  name: string;
  body: string;
  headband: string;
  aura: string;
}

export const FIGHTER_SKINS: FighterSkin[] = [
  { id: 0, name: 'Crimson Monk', body: '#f8fafc', headband: '#ef4444', aura: '#fca5a5' },
  { id: 1, name: 'Shadow Shinobi', body: '#1e293b', headband: '#38bdf8', aura: '#7dd3fc' },
  { id: 2, name: 'Golden Dragon', body: '#facc15', headband: '#b91c1c', aura: '#fde047' },
  { id: 3, name: 'Jade Master', body: '#10b981', headband: '#f8fafc', aura: '#6ee7b7' },
  { id: 4, name: 'Cyber Brawler', body: '#a855f7', headband: '#22d3ee', aura: '#e879f9' },
  { id: 5, name: 'Inferno Sensei', body: '#ea580c', headband: '#facc15', aura: '#fb923c' },
];

export function getFighterSkin(id: number): FighterSkin {
  return FIGHTER_SKINS.find((s) => s.id === id) || FIGHTER_SKINS[0];
}
