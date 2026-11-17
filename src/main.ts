import './style.css';
import {
  GlobalFighterEntry,
  fetchGlobalFighterHighscores,
  submitGlobalFighterScore,
} from './api/highscores';
import { FIGHTER_SKINS, getFighterSkin } from './data/fighters';
import { FighterStage } from './game/FighterStage';
import { soundFX } from './game/SoundFX';
import {
  FighterState,
  loadFighterState,
  recordFighterScore,
  resolveDeviceId,
  saveFighterState,
} from './storage/state';

type ScreenName = 'home' | 'options' | 'game' | 'highscores';
type HsMode = 'global' | 'local';

let state: FighterState;
let hsMode: HsMode = 'global';
let optionsFromPlay = false;
let stage: FighterStage | null = null;
let hsPollInterval: number | null = null;

function buildApp(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <section id="screen-home" class="screen home-screen">
      <div class="home-hero">
        <div class="emblem">🥋</div>
        <h1 class="game-title">1-Walk Fighter</h1>
        <p class="game-subtitle">
          Tik Links of Rechts op het exacte moment dat ninja's & dojo-bazen binnen bereik komen!
        </p>
        <div id="home-best-pill" class="best-pill hidden"></div>
      </div>
      <div class="home-actions">
        <button id="btn-home-play" class="btn btn-primary">Play Dojo</button>
        <button id="btn-home-options" class="btn btn-secondary">Vechter Kiezen</button>
        <button id="btn-home-highscores" class="btn btn-secondary">Highscores</button>
      </div>
    </section>

    <section id="screen-options" class="screen hidden">
      <div class="top-nav">
        <button id="btn-options-back" class="btn btn-small">← Terug</button>
        <h2 class="screen-heading">Dojo Opties</h2>
        <span style="width:60px"></span>
      </div>
      <div class="options-scroll">
        <div>
          <p class="section-label">Jouw Naam (voor Highscores)</p>
          <input id="player-name-input" class="name-input" type="text" maxlength="20" placeholder="Sensei" />
        </div>
        <div>
          <p class="section-label">Vechter Stijl</p>
          <div id="fighter-skin-grid" class="skin-grid"></div>
        </div>
        <button id="btn-options-start" class="btn btn-primary">Naar de Dojo</button>
      </div>
    </section>

    <section id="screen-game" class="screen game-screen hidden">
      <div class="game-top-bar">
        <button id="btn-game-menu" class="btn btn-small">← Menu</button>
        <div style="display:flex;gap:8px;">
          <button id="btn-game-options" class="btn btn-small">Vechter</button>
          <button id="btn-game-sound" class="btn btn-small">Geluid: Aan</button>
        </div>
      </div>
      <div class="hud-overlay">
        <div id="hud-score" class="hud-score">0 pts</div>
        <div id="hud-sub" class="hud-sub">❤️ 3 • KO: 0 • Combo: x0</div>
      </div>
      <canvas id="game-canvas" class="game-canvas"></canvas>
      <div id="gameover-card" class="gameover-card hidden">
        <div id="gameover-text" style="font-weight:800;font-size:1.1rem;">Knock-Out!</div>
        <button id="btn-retry" class="btn btn-primary" style="padding:12px;">Opnieuw Vechten</button>
      </div>
    </section>

    <section id="screen-highscores" class="screen hidden">
      <div class="top-nav">
        <button id="btn-hs-back" class="btn btn-small">← Terug</button>
        <h2 class="screen-heading">Highscores</h2>
        <button id="btn-hs-refresh" class="btn btn-small">Ververs</button>
      </div>
      <div class="hs-tabs">
        <button id="tab-hs-global" class="hs-tab active">Online Wereldwijd</button>
        <button id="tab-hs-local" class="hs-tab">Lokaal (Top 50)</button>
      </div>
      <div id="server-box" class="server-box hidden">
        <p class="section-label" style="margin:0;">Highscore Server URL</p>
        <div style="display:flex;gap:8px;">
          <input id="server-url-input" class="name-input" type="url" placeholder="https://arcade-highscores-worker...workers.dev" />
          <button id="btn-save-server" class="btn btn-small">Opslaan</button>
        </div>
      </div>
      <div id="hs-list" class="hs-list"></div>
    </section>
  `;
}

function showScreen(name: ScreenName): void {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  document.getElementById(`screen-${name}`)?.classList.remove('hidden');

  if (name === 'game') startStage();
  else stopStage();

  if (name === 'home') {
    const pill = document.getElementById('home-best-pill')!;
    if (state.bestScore > 0) {
      pill.textContent = `Record: ${state.bestScore} pts (${state.bestKills} KOs)`;
      pill.classList.remove('hidden');
    } else {
      pill.classList.add('hidden');
    }
  }

  if (name === 'highscores') {
    refreshHighscoresView();
    hsPollInterval = window.setInterval(() => refreshHighscoresView(), 12000);
  } else if (hsPollInterval !== null) {
    clearInterval(hsPollInterval);
    hsPollInterval = null;
  }
}

function renderOptions(): void {
  (document.getElementById('player-name-input') as HTMLInputElement).value = state.playerName;
  const grid = document.getElementById('fighter-skin-grid')!;
  grid.innerHTML = '';
  for (const s of FIGHTER_SKINS) {
    const btn = document.createElement('button');
    btn.className = `skin-card ${state.fighterSkin === s.id ? 'selected' : ''}`;
    btn.innerHTML = `<span class="swatch" style="background:${s.headband};box-shadow:0 0 8px ${s.aura}"></span><span>${s.name}</span>`;
    btn.onclick = () => {
      state.fighterSkin = s.id;
      saveFighterState(state);
      renderOptions();
    };
    grid.appendChild(btn);
  }
}

function startStage(): void {
  document.getElementById('gameover-card')!.classList.add('hidden');
  document.getElementById('btn-game-sound')!.textContent = `Geluid: ${state.soundEnabled ? 'Aan' : 'Uit'}`;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!stage) {
    stage = new FighterStage(
      canvas,
      { skin: getFighterSkin(state.fighterSkin) },
      {
        onHudUpdate: (score, kills, combo, hp, weaponHits) => {
          document.getElementById('hud-score')!.textContent = `${score} pts`;
          const wpn = weaponHits > 0 ? ` • ⚔️ ${weaponHits}` : '';
          document.getElementById('hud-sub')!.textContent = `❤️ ${hp} • KO: ${kills} • Combo: x${combo}${wpn}`;
        },
        onHit: (combo) => soundFX.playHit(combo),
        onWhiff: () => soundFX.playWhiff(),
        onHurt: () => soundFX.playHurt(),
        onGameOver: (score, kills, maxCombo) => {
          recordFighterScore(state, score, kills, maxCombo);
          document.getElementById('gameover-text')!.textContent =
            score >= state.bestScore ? `Nieuw record: ${score} pts (${kills} KO)!` : `Score: ${score} pts • ${kills} KO`;
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
    stage.resetGame();
  }
  stage.start();
}

function stopStage(): void {
  stage?.stop();
}

async function refreshHighscoresView(): Promise<void> {
  const list = document.getElementById('hs-list')!;
  const serverBox = document.getElementById('server-box')!;
  (document.getElementById('server-url-input') as HTMLInputElement).value = state.apiBaseUrl;

  document.getElementById('tab-hs-global')?.classList.toggle('active', hsMode === 'global');
  document.getElementById('tab-hs-local')?.classList.toggle('active', hsMode === 'local');

  if (hsMode === 'local') {
    serverBox.classList.add('hidden');
    if (state.highscores.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:30px;">Nog geen dojo-scores. Stap de arena in!</p>`;
      return;
    }
    list.innerHTML = state.highscores
      .map(
        (h, i) => `
        <div class="hs-row">
          <div class="hs-left">
            <span class="hs-rank">#${i + 1}</span>
            <div>
              <div class="hs-name">${h.playerName}</div>
              <div class="hs-meta">${getFighterSkin(h.fighterSkin).name} • ${h.kills} KOs (Max x${h.maxCombo})</div>
            </div>
          </div>
          <div class="hs-score">${h.score} pts</div>
        </div>`
      )
      .join('');
    return;
  }

  serverBox.classList.toggle('hidden', Boolean(state.apiBaseUrl));
  if (!state.apiBaseUrl) {
    list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:24px;">Vul je Worker-URL in voor online wereldranglijsten (lokaal werkt altijd offline).</p>`;
    return;
  }

  try {
    const res = await fetchGlobalFighterHighscores(state.apiBaseUrl, state.deviceId, 50);
    const entries: GlobalFighterEntry[] = res.entries || [];
    if (entries.length === 0) {
      list.innerHTML = `<p style="text-align:center;color:var(--muted);margin-top:30px;">Nog geen online scores. Word de eerste!</p>`;
      return;
    }
    list.innerHTML = entries
      .map(
        (e) => `
        <div class="hs-row ${e.deviceId === state.deviceId ? 'me' : ''}">
          <div class="hs-left">
            <span class="hs-rank">#${e.rank}</span>
            <div>
              <div class="hs-name">${e.playerName}</div>
              <div class="hs-meta">${getFighterSkin(e.fighterSkin).name} • ${e.kills} KOs</div>
            </div>
          </div>
          <div class="hs-score">${e.score} pts</div>
        </div>`
      )
      .join('');
  } catch {
    list.innerHTML = `<p style="text-align:center;color:#fca5a5;margin-top:24px;">Offline of server niet bereikbaar. Bekijk tab Lokaal!</p>`;
  }
}

async function init(): Promise<void> {
  const deviceId = await resolveDeviceId();
  state = loadFighterState(deviceId);
  soundFX.enabled = state.soundEnabled;
  buildApp();
  renderOptions();

  document.getElementById('btn-home-play')!.onclick = () => showScreen('game');
  document.getElementById('btn-home-options')!.onclick = () => {
    optionsFromPlay = false;
    renderOptions();
    showScreen('options');
  };
  document.getElementById('btn-home-highscores')!.onclick = () => showScreen('highscores');

  document.getElementById('btn-options-back')!.onclick = () => showScreen(optionsFromPlay ? 'game' : 'home');
  document.getElementById('btn-options-start')!.onclick = () => showScreen('game');
  document.getElementById('player-name-input')!.addEventListener('input', (e) => {
    state.playerName = (e.target as HTMLInputElement).value.slice(0, 20) || 'Sensei';
    saveFighterState(state);
  });

  document.getElementById('btn-game-menu')!.onclick = () => showScreen('home');
  document.getElementById('btn-game-options')!.onclick = () => {
    optionsFromPlay = true;
    renderOptions();
    showScreen('options');
  };
  document.getElementById('btn-game-sound')!.onclick = () => {
    state.soundEnabled = !state.soundEnabled;
    soundFX.enabled = state.soundEnabled;
    saveFighterState(state);
    document.getElementById('btn-game-sound')!.textContent = `Geluid: ${state.soundEnabled ? 'Aan' : 'Uit'}`;
  };
  document.getElementById('btn-retry')!.onclick = () => {
    document.getElementById('gameover-card')!.classList.add('hidden');
    stage?.resetGame();
  };

  document.getElementById('btn-hs-back')!.onclick = () => showScreen('home');
  document.getElementById('btn-hs-refresh')!.onclick = () => refreshHighscoresView();
  document.getElementById('tab-hs-global')!.onclick = () => {
    hsMode = 'global';
    refreshHighscoresView();
  };
  document.getElementById('tab-hs-local')!.onclick = () => {
    hsMode = 'local';
    refreshHighscoresView();
  };
  document.getElementById('btn-save-server')!.onclick = () => {
    state.apiBaseUrl = (document.getElementById('server-url-input') as HTMLInputElement).value.trim().replace(/\/+$/, '');
    saveFighterState(state);
    refreshHighscoresView();
  };

  showScreen('home');
}

init();
