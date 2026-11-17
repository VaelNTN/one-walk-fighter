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

function cleanUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export async function fetchGlobalFighterHighscores(
  baseUrl: string,
  deviceId: string,
  limit = 50
): Promise<GlobalFighterResponse> {
  const base = cleanUrl(baseUrl);
  if (!base) throw new Error('NO_BACKEND_URL');
  const res = await fetch(
    `${base}/api/one-walk-fighter/highscores?limit=${limit}&deviceId=${encodeURIComponent(deviceId)}`,
    { method: 'GET' }
  );
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return (await res.json()) as GlobalFighterResponse;
}

export async function submitGlobalFighterScore(
  baseUrl: string,
  payload: {
    deviceId: string;
    playerName: string;
    score: number;
    kills: number;
    maxCombo: number;
    fighterSkin: number;
  }
): Promise<void> {
  const base = cleanUrl(baseUrl);
  if (!base || payload.score <= 0) return;
  try {
    await fetch(`${base}/api/one-walk-fighter/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: payload.deviceId,
        playerName: payload.playerName.trim() || 'Sensei',
        score: payload.score,
        kills: payload.kills,
        maxCombo: payload.maxCombo,
        fighterSkin: payload.fighterSkin,
      }),
    });
  } catch {
    // Offline fallback stays silent
  }
}
