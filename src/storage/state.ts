import { Device } from '@capacitor/device';
import { FIGHTER_SKINS } from '../data/fighters';

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

function safeGetStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

function toNonNegInt(val: unknown, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

function sanitizeSkinId(val: unknown): number {
  const n = toNonNegInt(val, 0);
  return FIGHTER_SKINS.some((s) => s.id === n) ? n : 0;
}

export function cleanApiUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return '';
}

function generateFallbackDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `owf-${crypto.randomUUID()}`;
  }
  return `owf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function resolveDeviceId(): Promise<string> {
  const cached = safeGetStorage(DEVICE_KEY);
  try {
    const info = await Device.getId();
    if (info?.identifier && info.identifier.trim().length >= 4) {
      const id = `phone-${info.identifier.trim()}`;
      safeSetStorage(DEVICE_KEY, id);
      return id;
    }
  } catch {
    // Web fallback
  }
  if (cached && cached.trim().length >= 4) return cached;
  const fresh = generateFallbackDeviceId();
  safeSetStorage(DEVICE_KEY, fresh);
  return fresh;
}

export function loadFighterState(deviceId: string): FighterState {
  const defaultApi = cleanApiUrl(
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || ''
  );
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
    const raw = safeGetStorage(SAVE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<FighterState>;
    const rawList = Array.isArray(parsed.highscores) ? parsed.highscores : [];
    const cleanScores: FighterHighscore[] = [];
    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const score = toNonNegInt(item.score, 0);
      if (score <= 0) continue;
      cleanScores.push({
        id: typeof item.id === 'string' && item.id ? item.id : `${Date.now().toString(36)}`,
        playerName:
          typeof item.playerName === 'string' && item.playerName.trim()
            ? item.playerName.trim().slice(0, 20)
            : 'Sensei',
        score,
        kills: toNonNegInt(item.kills, 0),
        maxCombo: toNonNegInt(item.maxCombo, 0),
        fighterSkin: sanitizeSkinId(item.fighterSkin),
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      });
    }
    cleanScores.sort((a, b) => b.score - a.score);

    const storedBestScore = toNonNegInt(parsed.bestScore, 0);
    const storedBestKills = toNonNegInt(parsed.bestKills, 0);
    const parsedApi = cleanApiUrl(parsed.apiBaseUrl);

    return {
      deviceId,
      apiBaseUrl: parsedApi || defaultApi,
      fighterSkin: sanitizeSkinId(parsed.fighterSkin),
      playerName:
        typeof parsed.playerName === 'string' && parsed.playerName.trim()
          ? parsed.playerName.trim().slice(0, 20)
          : 'Sensei',
      soundEnabled: parsed.soundEnabled !== false,
      bestScore: Math.max(storedBestScore, cleanScores[0]?.score ?? 0),
      bestKills: storedBestKills,
      highscores: cleanScores.slice(0, 50),
    };
  } catch {
    return base;
  }
}

export function saveFighterState(state: FighterState): void {
  safeSetStorage(SAVE_KEY, JSON.stringify(state));
}

export function recordFighterScore(state: FighterState, score: number, kills: number, maxCombo: number): void {
  const cleanScore = toNonNegInt(score, 0);
  const cleanKills = toNonNegInt(kills, 0);
  const cleanCombo = toNonNegInt(maxCombo, 0);
  if (cleanScore <= 0) return;

  if (cleanScore > state.bestScore) state.bestScore = cleanScore;
  if (cleanKills > state.bestKills) state.bestKills = cleanKills;
  state.highscores.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    playerName: state.playerName.trim().slice(0, 20) || 'Sensei',
    score: cleanScore,
    kills: cleanKills,
    maxCombo: cleanCombo,
    fighterSkin: sanitizeSkinId(state.fighterSkin),
    createdAt: new Date().toISOString(),
  });
  state.highscores = state.highscores.sort((a, b) => b.score - a.score).slice(0, 50);
  saveFighterState(state);
}
