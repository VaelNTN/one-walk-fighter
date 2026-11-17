import { Device } from '@capacitor/device';

const SAVE_KEY = 'one_walk_fighter_save_v1';
const DEVICE_KEY = 'one_walk_fighter_device_id_v1';

export interface FighterHighscore {
  id: string;
  playerName: string;
  score: number;
  kills: number;
  maxCombo: number;
  fighterSkin: number;
  createdAt: string;
}

export interface FighterState {
  deviceId: string;
  apiBaseUrl: string;
  fighterSkin: number;
  playerName: string;
  soundEnabled: boolean;
  bestScore: number;
  bestKills: number;
  highscores: FighterHighscore[];
}

function generateFallbackDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `owf-${crypto.randomUUID()}`;
  }
  return `owf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function resolveDeviceId(): Promise<string> {
  const cached = localStorage.getItem(DEVICE_KEY);
  try {
    const info = await Device.getId();
    if (info?.identifier && info.identifier.trim().length >= 4) {
      const id = `phone-${info.identifier.trim()}`;
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    }
  } catch {
    // Web fallback
  }
  if (cached && cached.trim().length >= 4) return cached;
  const fresh = generateFallbackDeviceId();
  localStorage.setItem(DEVICE_KEY, fresh);
  return fresh;
}

export function loadFighterState(deviceId: string): FighterState {
  const defaultApi = ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const base: FighterState = {
    deviceId,
    apiBaseUrl: defaultApi,
    fighterSkin: 0,
    playerName: 'Sensei',
    soundEnabled: true,
    bestScore: 0,
    bestKills: 0,
    highscores: [],
  };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<FighterState>;
    return {
      deviceId,
      apiBaseUrl:
        typeof parsed.apiBaseUrl === 'string' && parsed.apiBaseUrl.trim()
          ? parsed.apiBaseUrl.trim().replace(/\/+$/, '')
          : defaultApi,
      fighterSkin: typeof parsed.fighterSkin === 'number' ? parsed.fighterSkin : 0,
      playerName:
        typeof parsed.playerName === 'string' && parsed.playerName.trim()
          ? parsed.playerName.trim()
          : 'Sensei',
      soundEnabled: parsed.soundEnabled !== false,
      bestScore: Math.max(0, Number(parsed.bestScore || 0)),
      bestKills: Math.max(0, Number(parsed.bestKills || 0)),
      highscores: Array.isArray(parsed.highscores) ? parsed.highscores : [],
    };
  } catch {
    return base;
  }
}

export function saveFighterState(state: FighterState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function recordFighterScore(state: FighterState, score: number, kills: number, maxCombo: number): void {
  if (score <= 0) return;
  if (score > state.bestScore) state.bestScore = score;
  if (kills > state.bestKills) state.bestKills = kills;
  state.highscores.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    playerName: state.playerName.trim() || 'Sensei',
    score,
    kills,
    maxCombo,
    fighterSkin: state.fighterSkin,
    createdAt: new Date().toISOString(),
  });
  state.highscores = state.highscores.sort((a, b) => b.score - a.score).slice(0, 50);
  saveFighterState(state);
}
