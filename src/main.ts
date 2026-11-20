import './style.css';
import {
  flushPendingFighterScores,
  GlobalFighterEntry,
  fetchGlobalFighterHighscores,
  submitGlobalFighterScore,
} from './api/highscores';
import { FIGHTER_SKINS, getFighterSkin } from './data/fighters';
import { drawMartialFighter } from './game/fighterRenderer';
import { FighterStage } from './game/FighterStage';
import { soundFX } from './game/SoundFX';
import {
  cleanApiUrl,
  FighterState,
  loadFighterState,
  recordFighterScore,
  resolveDeviceId,
  saveFighterState,
} from './storage/state';

type ScreenName = 'home' | 'options' | 'game' | 'highscores';
type HsMode = 'global' | 'local';

let state: FighterState;
let currentScreen: ScreenName = 'home';
let hsMode: HsMode = 'global';
let optionsFromPlay = false;
let confirmQuitArmed = false;
let stage: FighterStage | null = null;
let hsPollInterval: number | null = null;
let hsFetchSeq = 0;
let homePreviewRaf: number | null = null;
let hsHeadingTapCount = 0;
let hsHeadingTapTimer: number | null = null;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderFighterThumb(canvas: HTMLCanvasElement, skinId: number): void {
  const size = 48;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const skin = getFighterSkin(skinId);
  drawMartialFighter(ctx, {
    x: size / 2,
    y: 41,
    scale: 0.56,
    bodyColor: skin.body,
    headbandColor: skin.headband,
    beltColor: '#0f172a',
    facing: 1,
    pose: 'idle',
    phase: 0.4,
    auraColor: skin.aura,
    archetype: 'player',
  });
}

function buildApp(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <section id="screen-home" class="screen home-screen">
      <div class="home-topbar">
        <button id="btn-home-more" class="btn btn-small">✨ More Games</button>
        <button id="btn-home-sound" class="btn btn-small" aria-label="Toggle sound">🔊</button>
      </div>
      <div class="home-content">
        <div class="home-hero">
          <div class="emblem">
            <canvas id="home-fighter-canvas" class="home-fighter-canvas"></canvas>
          </div>
          <h1 class="game-title">1-Walk Fighter</h1>
          <p class="game-subtitle">Tap left or right when enemies enter your strike zone!</p>
          <div id="home-best-pill" class="best-pill hidden"></div>
        </div>
        <div class="home-actions">
          <button id="btn-home-play" class="btn btn-primary">▶ Enter Dojo</button>
          <div class="home-secondary-row">
            <button id="btn-home-options" class="btn btn-secondary">🥋 Fighters</button>
            <button id="btn-home-highscores" class="btn btn-secondary">🏆 Ranks</button>
          </div>
        </div>
      </div>
    </section>

    <section id="screen-options" class="screen hidden">
      <div class="top-nav">
        <button id="btn-options-back" class="btn btn-small">← Back</button>
        <h2 class="screen-heading">Fighters</h2>
        <span style="width:60px"></span>
      </div>
      <div class="options-scroll">
        <div>
          <p class="section-label">Fighter Name</p>
          <input id="player-name-input" class="name-input" type="text" maxlength="20" placeholder="Sensei" />
        </div>
        <div>
          <p class="section-label">Fighter Style</p>
          <div id="fighter-skin-grid" class="skin-grid"></div>
        </div>
        <button id="btn-options-start" class="btn btn-primary">Enter Dojo</button>
      </div>
    </section>

    <section id="screen-game" class="screen game-screen hidden">
      <div class="game-top-bar">
        <button id="btn-game-pause" class="btn btn-small">⏸ Pause</button>
        <div style="display:flex;gap:8px;">
          <button id="btn-game-options" class="btn btn-small">🥋 Fighter</button>
          <button id="btn-game-sound" class="btn btn-small" aria-label="Toggle sound">🔊</button>
        </div>
      </div>
      <div class="hud-overlay">
        <div id="hud-score" class="hud-score">0 pts</div>
        <div id="hud-sub" class="hud-sub">❤️ 3 • KO: 0 • Combo: x0</div>
      </div>
      <canvas id="game-canvas" class="game-canvas"></canvas>
      <div id="gameover-card" class="gameover-card hidden">
        <div id="gameover-text" style="font-weight:800;font-size:1.1rem;">Knockout!</div>
        <button id="btn-retry" class="btn btn-primary" style="padding:12px;">↻ Retry</button>
        <div class="gameover-actions-row">
          <button id="btn-go-menu" class="btn btn-secondary" style="padding:10px;font-size:0.9rem;">Menu</button>
          <button id="btn-go-hs" class="btn btn-secondary" style="padding:10px;font-size:0.9rem;">Leaderboard</button>
        </div>
      </div>
    </section>

    <section id="screen-highscores" class="screen hidden">
      <div class="top-nav">
        <button id="btn-hs-back" class="btn btn-small">← Back</button>
        <h2 id="hs-heading" class="screen-heading">🏆 Leaderboard</h2>
        <button id="btn-hs-refresh" class="btn btn-small">↻</button>
      </div>
      <div id="hs-status-banner" class="hs-status-banner">📱 Offline Mode — Local Highscores</div>
      <div class="hs-tabs">
        <button id="tab-hs-global" class="hs-tab active">🌍 Global</button>
        <button id="tab-hs-local" class="hs-tab">📱 Local</button>
      </div>
      <div id="server-box" class="server-box hidden">
        <p class="section-label" style="margin:0;">Developer Endpoint URL</p>
        <div style="display:flex;gap:8px;">
          <input id="server-url-input" class="name-input" type="url" placeholder="https://example.com" />
          <button id="btn-save-server" class="btn btn-small">Save</button>
        </div>
      </div>
      <div id="hs-list" class="hs-list"></div>
    </section>

    <div id="pause-modal" class="modal-backdrop hidden">
      <div class="modal-card">
        <h3 class="modal-title">⏸ Dojo Paused</h3>
        <p class="modal-sub">Catch your breath, warrior.</p>
        <button id="btn-pause-resume" class="btn btn-primary" style="padding:13px;">▶ Resume Fight</button>
        <button id="btn-pause-skins" class="btn btn-secondary">🥋 Switch Fighter</button>
        <button id="btn-pause-restart" class="btn btn-secondary">↻ Restart Bout</button>
        <button id="btn-pause-quit" class="btn btn-danger">🚪 Quit to Menu</button>
      </div>
    </div>

    <div id="more-games-modal" class="modal-backdrop hidden">
      <div class="modal-card">
        <h3 class="modal-title">✨ More by VaelNTN</h3>
        <p class="modal-sub">Explore more handcrafted games from VaelNTN Studios.</p>
        <div class="more-games-list">
          <a class="more-game-item featured" href="https://github.com/VaelNTN/starforge-survivors/releases/latest" target="_blank" rel="noopener noreferrer">
            <div>
              <div class="more-game-name">⭐ Starforge Survivors</div>
              <div class="more-game-desc">Flagship sci-fi roguelite — 6 heroes, 6 bosses & zero ads</div>
            </div>
            <span class="more-game-badge">FLAGSHIP</span>
          </a>
          <a class="more-game-item" href="https://github.com/VaelNTN/frog-parkour/releases/latest" target="_blank" rel="noopener noreferrer">
            <div>
              <div class="more-game-name">🐸 Frog Parkour</div>
              <div class="more-game-desc">Tongue-grapple lilypad leap across misty ponds</div>
            </div>
          </a>
          <a class="more-game-item" href="https://github.com/VaelNTN/pocket-tanks-duel/releases/latest" target="_blank" rel="noopener noreferrer">
            <div>
              <div class="more-game-name">💥 Matey Tanks</div>
              <div class="more-game-desc">Artillery physics with wind & mana arsenal</div>
            </div>
          </a>
          <a class="more-game-item" href="https://github.com/VaelNTN/arcade-100-hub/releases/latest" target="_blank" rel="noopener noreferrer">
            <div>
              <div class="more-game-name">🕹️ Arcade 100 Hub</div>
              <div class="more-game-desc">100 instant retro mini-games in one app</div>
            </div>
          </a>
        </div>
        <button id="btn-more-close" class="btn btn-secondary">Close</button>
      </div>
    </div>
  `;
}

function startHomePreview(): void {
  stopHomePreview();
  syncSoundButton();
  const canvas = document.getElementById('home-fighter-canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = 120;

  const drawFrame = (ts: number) => {
    if (currentScreen !== 'home') {
      homePreviewRaf = null;
      return;
    }
    if (!document.hidden) {
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const target = Math.round(size * dpr);
      if (canvas.width !== target || canvas.height !== target) {
        canvas.width = target;
        canvas.height = target;
      }

      const t = ts / 1000;
      const skin = getFighterSkin(state.fighterSkin);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Inner twilight crimson moon halo
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 - 6, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2 - 6, 28, 0, Math.PI * 2);
      ctx.fill();

      drawMartialFighter(ctx, {
        x: size / 2 + 2,
        y: 94,
        scale: 1.08,
        bodyColor: skin.body,
        headbandColor: skin.headband,
        beltColor: '#0f172a',
        facing: 1,
        pose: 'idle',
        phase: t,
        auraColor: skin.aura,
        archetype: 'player',
      });
    }
    homePreviewRaf = requestAnimationFrame(drawFrame);
  };
  homePreviewRaf = requestAnimationFrame(drawFrame);
}

function stopHomePreview(): void {
  if (homePreviewRaf !== null) {
    cancelAnimationFrame(homePreviewRaf);
    homePreviewRaf = null;
  }
}

function syncSoundButton(): void {
  const icon = state.soundEnabled ? '🔊' : '🔇';
  const btn = document.getElementById('btn-game-sound');
  if (btn) btn.textContent = icon;
  const homeBtn = document.getElementById('btn-home-sound');
  if (homeBtn) homeBtn.textContent = icon;
}

function toggleSound(): void {
  state.soundEnabled = !state.soundEnabled;
  soundFX.enabled = state.soundEnabled;
  saveFighterState(state);
  syncSoundButton();
}

function openPauseModal(): void {
  if (!stage || stage.isDead()) return;
  stage.setPaused(true);
  confirmQuitArmed = false;
  const quitBtn = document.getElementById('btn-pause-quit');
  if (quitBtn) quitBtn.textContent = '🚪 Quit to Menu';
  document.getElementById('pause-modal')?.classList.remove('hidden');
}

function closePauseModal(resume = true): void {
  document.getElementById('pause-modal')?.classList.add('hidden');
  confirmQuitArmed = false;
  if (resume && stage && !stage.isDead()) {
    stage.setPaused(false);
  }
}

function showScreen(name: ScreenName, opts?: { resumeRun?: boolean }): void {
  currentScreen = name;
  closePauseModal(false);
  document.getElementById('more-games-modal')?.classList.add('hidden');
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  document.getElementById(`screen-${name}`)?.classList.remove('hidden');

  if (hsPollInterval !== null) {
    clearInterval(hsPollInterval);
    hsPollInterval = null;
  }

  if (name === 'game') startStage(Boolean(opts?.resumeRun));
  else stopStage();

  if (name === 'home') {
    const pill = document.getElementById('home-best-pill')!;
    if (state.bestScore > 0) {
      pill.textContent = `Best: ${state.bestScore} pts (${state.bestKills} KOs)`;
      pill.classList.remove('hidden');
    } else {
      pill.classList.add('hidden');
    }
    startHomePreview();
  } else {
    stopHomePreview();
  }

  if (name === 'highscores') {
    if (state.apiBaseUrl) {
      flushPendingFighterScores(state.apiBaseUrl).catch(() => {});
    }
    refreshHighscoresView();
    hsPollInterval = window.setInterval(() => refreshHighscoresView(), 12000);
  }
}

function renderOptions(): void {
  (document.getElementById('player-name-input') as HTMLInputElement).value = state.playerName;
  const startBtn = document.getElementById('btn-options-start');
  if (startBtn) {
    startBtn.textContent = optionsFromPlay && stage && !stage.isDead() ? '▶ Resume Fight' : 'Enter Dojo';
  }
  const grid = document.getElementById('fighter-skin-grid')!;
  grid.innerHTML = '';
  for (const s of FIGHTER_SKINS) {
    const btn = document.createElement('button');
    btn.className = `skin-card ${state.fighterSkin === s.id ? 'selected' : ''}`;
    btn.innerHTML = `<canvas class="skin-thumb" width="48" height="48"></canvas><span>${escapeHtml(s.name)}</span>`;
    renderFighterThumb(btn.querySelector('canvas')!, s.id);
    btn.onclick = () => {
      state.fighterSkin = s.id;
      saveFighterState(state);
      stage?.setSkin(getFighterSkin(state.fighterSkin));
      renderOptions();
    };
    grid.appendChild(btn);
  }
}

function startStage(resumeRun = false): void {
  syncSoundButton();
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!stage) {
    document.getElementById('gameover-card')!.classList.add('hidden');
    stage = new FighterStage(
      canvas,
      { skin: getFighterSkin(state.fighterSkin) },
      {
        onHudUpdate: (score, kills, combo, hp, weaponHits) => {
          document.getElementById('hud-score')!.textContent = `${score} pts`;
          const wpn = weaponHits > 0 ? ` • ⚔️ ${weaponHits}` : '';
          document.getElementById('hud-sub')!.textContent = `❤️ ${hp} • KO: ${kills} • Combo: x${combo}${wpn}`;
        },
        onHit: (combo, isCrit) => soundFX.playHit(combo, isCrit),
        onBossKO: () => soundFX.playBossKO(),
        onWhiff: () => soundFX.playWhiff(),
        onHurt: () => soundFX.playHurt(),
        onGameOver: (score, kills, maxCombo) => {
          const prevBest = state.bestScore;
          recordFighterScore(state, score, kills, maxCombo);
          const isNewRecord = score > 0 && score > prevBest;
          document.getElementById('gameover-text')!.textContent = isNewRecord
            ? `New Record: ${score} pts (${kills} KO)!`
            : `Score: ${score} pts • ${kills} KO`;
          document.getElementById('gameover-card')!.classList.remove('hidden');
          if (state.apiBaseUrl && score > 0) {
            submitGlobalFighterScore(state.apiBaseUrl, {
              deviceId: state.deviceId,
              playerName: state.playerName,
              score,
              kills,
              maxCombo,
              fighterSkin: state.fighterSkin,
            });
          }
        },
      }
    );
  } else {
    stage.setSkin(getFighterSkin(state.fighterSkin));
    if (!resumeRun || stage.isDead()) {
      document.getElementById('gameover-card')!.classList.add('hidden');
      stage.resetGame();
    } else {
      stage.setPaused(false);
    }
  }
  stage.start();
}

function stopStage(): void {
  stage?.stop();
}

function updateHsStatusBanner(online: boolean): void {
  const banner = document.getElementById('hs-status-banner');
  if (!banner) return;
  banner.textContent = online ? '🌐 Online Leaderboard' : '📱 Offline Mode — Local Highscores';
}

async function refreshHighscoresView(): Promise<void> {
  const seq = ++hsFetchSeq;
  const list = document.getElementById('hs-list')!;
  (document.getElementById('server-url-input') as HTMLInputElement).value = state.apiBaseUrl;

  document.getElementById('tab-hs-global')?.classList.toggle('active', hsMode === 'global');
  document.getElementById('tab-hs-local')?.classList.toggle('active', hsMode === 'local');

  if (hsMode === 'local') {
    updateHsStatusBanner(Boolean(state.apiBaseUrl));
    if (state.highscores.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:30px;">No scores yet. Step into the dojo!</p>`;
      return;
    }
    list.innerHTML = state.highscores
      .map(
        (h, i) => `
        <div class="hs-row">
          <div class="hs-left">
            <span class="hs-rank">#${i + 1}</span>
            <div>
              <div class="hs-name">${escapeHtml(h.playerName)}</div>
              <div class="hs-meta">${escapeHtml(getFighterSkin(h.fighterSkin).name)} • ${h.kills} KOs (Max x${h.maxCombo})</div>
            </div>
          </div>
          <div class="hs-score">${h.score} pts</div>
        </div>`
      )
      .join('');
    return;
  }

  if (!state.apiBaseUrl) {
    updateHsStatusBanner(false);
    list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:24px;">Playing offline. Switch to Local to view your personal records!</p>`;
    return;
  }

  try {
    const res = await fetchGlobalFighterHighscores(state.apiBaseUrl, state.deviceId, 50);
    if (seq !== hsFetchSeq || hsMode !== 'global' || currentScreen !== 'highscores') return;
    updateHsStatusBanner(true);
    const entries: GlobalFighterEntry[] = res.entries || [];
    if (entries.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:30px;">No online scores yet. Be the first!</p>`;
      return;
    }
    list.innerHTML = entries
      .map(
        (e) => `
        <div class="hs-row ${e.deviceId === state.deviceId ? 'me' : ''}">
          <div class="hs-left">
            <span class="hs-rank">#${Number(e.rank) || 0}</span>
            <div>
              <div class="hs-name">${escapeHtml(String(e.playerName || 'Sensei'))}</div>
              <div class="hs-meta">${escapeHtml(getFighterSkin(e.fighterSkin).name)} • ${Number(e.kills) || 0} KOs</div>
            </div>
          </div>
          <div class="hs-score">${Number(e.score) || 0} pts</div>
        </div>`
      )
      .join('');
  } catch {
    if (seq !== hsFetchSeq || hsMode !== 'global' || currentScreen !== 'highscores') return;
    updateHsStatusBanner(false);
    list.innerHTML = `<p style="text-align:center;color:#fca5a5;margin-top:24px;">Offline or leaderboard unreachable. Check the Local tab!</p>`;
  }
}

async function init(): Promise<void> {
  const deviceId = await resolveDeviceId();
  state = loadFighterState(deviceId);
  soundFX.enabled = state.soundEnabled;
  buildApp();
  renderOptions();

  if (state.apiBaseUrl) {
    flushPendingFighterScores(state.apiBaseUrl).catch(() => {});
  }
  window.addEventListener('online', () => {
    if (state.apiBaseUrl) {
      flushPendingFighterScores(state.apiBaseUrl).catch(() => {});
    }
  });

  document.getElementById('btn-home-play')!.onclick = () => showScreen('game');
  document.getElementById('btn-home-sound')!.onclick = () => toggleSound();
  document.getElementById('btn-home-more')!.onclick = () => {
    document.getElementById('more-games-modal')?.classList.remove('hidden');
  };
  document.getElementById('btn-more-close')!.onclick = () => {
    document.getElementById('more-games-modal')?.classList.add('hidden');
  };
  document.getElementById('more-games-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('more-games-modal')?.classList.add('hidden');
    }
  });
  document.getElementById('btn-home-options')!.onclick = () => {
    optionsFromPlay = false;
    renderOptions();
    showScreen('options');
  };
  document.getElementById('btn-home-highscores')!.onclick = () => showScreen('highscores');

  document.getElementById('btn-options-back')!.onclick = () => {
    if (optionsFromPlay) showScreen('game', { resumeRun: true });
    else showScreen('home');
  };
  document.getElementById('btn-options-start')!.onclick = () => {
    showScreen('game', { resumeRun: optionsFromPlay });
  };

  const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
  nameInput.addEventListener('input', (e) => {
    state.playerName = (e.target as HTMLInputElement).value.slice(0, 20);
    saveFighterState(state);
  });
  nameInput.addEventListener('blur', (e) => {
    const clean = (e.target as HTMLInputElement).value.trim().slice(0, 20) || 'Sensei';
    state.playerName = clean;
    (e.target as HTMLInputElement).value = clean;
    saveFighterState(state);
  });

  document.getElementById('btn-game-pause')!.onclick = () => openPauseModal();
  document.getElementById('btn-game-options')!.onclick = () => {
    optionsFromPlay = true;
    stage?.setPaused(true);
    renderOptions();
    showScreen('options');
  };
  document.getElementById('btn-game-sound')!.onclick = () => toggleSound();

  document.getElementById('btn-pause-resume')!.onclick = () => closePauseModal(true);
  document.getElementById('btn-pause-skins')!.onclick = () => {
    closePauseModal(false);
    optionsFromPlay = true;
    renderOptions();
    showScreen('options');
  };
  document.getElementById('btn-pause-restart')!.onclick = () => {
    closePauseModal(false);
    document.getElementById('gameover-card')!.classList.add('hidden');
    if (stage) {
      stage.resetGame();
      stage.start();
    }
  };
  document.getElementById('btn-pause-quit')!.onclick = () => {
    const quitBtn = document.getElementById('btn-pause-quit')!;
    if (!confirmQuitArmed) {
      confirmQuitArmed = true;
      quitBtn.textContent = '⚠ Tap again to Quit';
      return;
    }
    showScreen('home');
  };

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && currentScreen === 'game' && stage && !stage.isDead()) {
      if (stage.isPaused()) closePauseModal(true);
      else openPauseModal();
    }
  });

  document.getElementById('btn-retry')!.onclick = () => {
    document.getElementById('gameover-card')!.classList.add('hidden');
    if (stage) {
      stage.resetGame();
      stage.start();
    }
  };
  document.getElementById('btn-go-menu')!.onclick = () => showScreen('home');
  document.getElementById('btn-go-hs')!.onclick = () => showScreen('highscores');

  document.getElementById('btn-hs-back')!.onclick = () => showScreen('home');
  document.getElementById('btn-hs-refresh')!.onclick = () => refreshHighscoresView();
  document.getElementById('hs-heading')!.onclick = () => {
    hsHeadingTapCount += 1;
    if (hsHeadingTapTimer !== null) window.clearTimeout(hsHeadingTapTimer);
    hsHeadingTapTimer = window.setTimeout(() => {
      hsHeadingTapCount = 0;
    }, 1500);
    if (hsHeadingTapCount >= 5) {
      hsHeadingTapCount = 0;
      document.getElementById('server-box')?.classList.toggle('hidden');
    }
  };
  document.getElementById('tab-hs-global')!.onclick = () => {
    hsMode = 'global';
    refreshHighscoresView();
  };
  document.getElementById('tab-hs-local')!.onclick = () => {
    hsMode = 'local';
    refreshHighscoresView();
  };
  document.getElementById('btn-save-server')!.onclick = () => {
    const raw = (document.getElementById('server-url-input') as HTMLInputElement).value;
    state.apiBaseUrl = cleanApiUrl(raw);
    saveFighterState(state);
    if (state.apiBaseUrl) {
      flushPendingFighterScores(state.apiBaseUrl).catch(() => {});
    }
    refreshHighscoresView();
  };

  showScreen('home');
}

init();

