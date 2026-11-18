export interface GlobalFighterEntry {
  rank: number;
  deviceId: string;
  playerName: string;
  score: number;
  kills: number;
  maxCombo: number;
  fighterSkin: number;
  updatedAt: string;
}

export interface GlobalFighterResponse {
  ok: boolean;
  entries: GlobalFighterEntry[];
  player: GlobalFighterEntry | null;
}

export interface SubmitScorePayload {
  deviceId: string;
  playerName: string;
  score: number;
  kills: number;
  maxCombo: number;
  fighterSkin: number;
}

const PENDING_SCORES_KEY = 'one_walk_fighter_pending_scores_v1';
const REQUEST_TIMEOUT_MS = 8000;

function cleanUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : '';
}

function sanitizePayload(payload: SubmitScorePayload): SubmitScorePayload | null {
  const score = Math.floor(Number(payload.score));
  if (!Number.isFinite(score) || score <= 0) return null;
  const kills = Math.max(0, Math.floor(Number(payload.kills) || 0));
  const maxCombo = Math.max(0, Math.floor(Number(payload.maxCombo) || 0));
  const fighterSkin = Math.max(0, Math.floor(Number(payload.fighterSkin) || 0));
  return {
    deviceId: String(payload.deviceId || '').trim(),
    playerName: String(payload.playerName || '').trim().slice(0, 20) || 'Sensei',
    score,
    kills,
    maxCombo,
    fighterSkin,
  };
}

function loadPendingScores(): SubmitScorePayload[] {
  try {
    const raw = localStorage.getItem(PENDING_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizePayload(item as SubmitScorePayload))
      .filter((item): item is SubmitScorePayload => item !== null)
      .slice(-10);
  } catch {
    return [];
  }
}

function savePendingScores(queue: SubmitScorePayload[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(PENDING_SCORES_KEY);
    else localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(queue.slice(-10)));
  } catch {
    // Ignore storage errors
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchGlobalFighterHighscores(
  baseUrl: string,
  deviceId: string,
  limit = 50
): Promise<GlobalFighterResponse> {
  const base = cleanUrl(baseUrl);
  if (!base) throw new Error('NO_BACKEND_URL');
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
  const res = await fetchWithTimeout(
    `${base}/api/one-walk-fighter/highscores?limit=${safeLimit}&deviceId=${encodeURIComponent(deviceId)}`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return (await res.json()) as GlobalFighterResponse;
}

async function postScoreOnce(base: string, payload: SubmitScorePayload): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${base}/api/one-walk-fighter/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitGlobalFighterScore(baseUrl: string, payload: SubmitScorePayload): Promise<boolean> {
  const base = cleanUrl(baseUrl);
  const clean = sanitizePayload(payload);
  if (!base || !clean || !clean.deviceId) return false;

  for (let attempt = 0; attempt < 2; attempt++) {
    if (await postScoreOnce(base, clean)) {
      return true;
    }
    if (attempt === 0) {
      await new Promise((r) => window.setTimeout(r, 450));
    }
  }

  // Queue failed submission for retry when connectivity returns
  const queue = loadPendingScores();
  queue.push(clean);
  savePendingScores(queue);
  return false;
}

export async function flushPendingFighterScores(baseUrl: string): Promise<void> {
  const base = cleanUrl(baseUrl);
  if (!base) return;
  const queue = loadPendingScores();
  if (queue.length === 0) return;

  const remaining: SubmitScorePayload[] = [];
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const ok = await postScoreOnce(base, item);
    if (!ok) {
      remaining.push(...queue.slice(i));
      break;
    }
  }
  savePendingScores(remaining);
}
