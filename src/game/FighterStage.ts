import { FighterSkin } from '../data/fighters';
import { drawMartialFighter, FighterArchetype } from './fighterRenderer';

type Side = -1 | 1;
type EnemyKind = 'ninja' | 'samurai' | 'oni';

interface Enemy {
  id: number;
  side: Side;
  dist: number; // distance from player center in px
  speed: number;
  hp: number;
  maxHp: number;
  kind: EnemyKind;
  flipOnHit: boolean;
  flash: number;
}

interface FlyBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  facing: Side;
  color: string;
  headband?: string;
  archetype: FighterArchetype;
  life: number;
  maxLife: number;
}

interface ShockRing {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
}

interface HitSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface SlashArc {
  x: number;
  y: number;
  side: Side;
  angle: number;
  radius: number;
  color: string;
  isWeapon: boolean;
  life: number;
  maxLife: number;
}

interface DustPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface FloatingPopup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

interface SakuraPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  spin: number;
  depth: number;
}

interface StarDot {
  nx: number;
  ny: number;
  size: number;
  phase: number;
}

export interface FighterCallbacks {
  onHudUpdate: (score: number, kills: number, combo: number, hp: number, weaponHits: number) => void;
  onHit: (combo: number, isCrit?: boolean) => void;
  onBossKO?: () => void;
  onWhiff: () => void;
  onHurt: () => void;
  onGameOver: (score: number, kills: number, maxCombo: number) => void;
}

export class FighterStage {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private skin: FighterSkin;
  private callbacks: FighterCallbacks;

  private width = 0;
  private height = 0;
  private dpr = 1;
  private active = false;
  private paused = false;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private lastTime = 0;
  private clock = 0;

  private score = 0;
  private kills = 0;
  private combo = 0;
  private maxCombo = 0;
  private hp = 3;
  private weaponHits = 0;
  private facing: Side = 1;
  private lungePx = 0;
  private lungeTimer = 0;
  private attackStyle: 0 | 1 = 0;
  private staggerTimer = 0;
  private shakeTimer = 0;
  private shakeMag = 0;
  private hitStopTimer = 0;
  private hurtFlashTimer = 0;
  private camX = 0;
  private dead = false;
  private currentDojoTier = -1;

  private enemies: Enemy[] = [];
  private bodies: FlyBody[] = [];
  private rings: ShockRing[] = [];
  private sparks: HitSpark[] = [];
  private slashes: SlashArc[] = [];
  private dust: DustPuff[] = [];
  private popups: FloatingPopup[] = [];
  private petals: SakuraPetal[] = [];
  private stars: StarDot[] = [];
  private nextId = 1;
  private spawnTimer = 0.6;

  // Cached gradients rebuilt on resize or dojo tier change for crisp 60fps mobile rendering
  private skyGrad: CanvasGradient | null = null;
  private moonGlowGrad: CanvasGradient | null = null;
  private floorSheenGrad: CanvasGradient | null = null;
  private lanternGlowGrad: CanvasGradient | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    opts: { skin: FighterSkin },
    callbacks: FighterCallbacks
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D unavailable');
    this.ctx = context;
    this.skin = opts.skin;
    this.callbacks = callbacks;

    this.initAmbientScene();

    this.handleResize = this.handleResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.loop = this.loop.bind(this);
  }

  private initAmbientScene(): void {
    this.stars = Array.from({ length: 24 }, () => ({
      nx: Math.random(),
      ny: Math.random() * 0.42,
      size: 0.8 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));
    this.petals = Array.from({ length: 28 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: -18 - Math.random() * 24,
      vy: 22 + Math.random() * 26,
      size: 3 + Math.random() * 3.5,
      phase: Math.random() * Math.PI * 2,
      spin: 2 + Math.random() * 3,
      depth: 0.5 + Math.random() * 0.5,
    }));
  }

  public setSkin(skin: FighterSkin): void {
    this.skin = skin;
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (!p) this.lastTime = performance.now();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public isDead(): boolean {
    return this.dead;
  }

  private getGroundY(): number {
    return this.height < 480 ? this.height * 0.72 : this.height * 0.64;
  }

  public resetGame(): void {
    this.score = 0;
    this.kills = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = 3;
    this.weaponHits = 0;
    this.facing = 1;
    this.lungePx = 0;
    this.lungeTimer = 0;
    this.staggerTimer = 0;
    this.shakeTimer = 0;
    this.shakeMag = 0;
    this.hitStopTimer = 0;
    this.hurtFlashTimer = 0;
    this.camX = 0;
    this.dead = false;
    this.paused = false;
    this.enemies = [];
    this.bodies = [];
    this.rings = [];
    this.sparks = [];
    this.slashes = [];
    this.dust = [];
    this.popups = [];
    this.spawnTimer = 0.35;
    this.currentDojoTier = -1;
    this.rebuildBackdropCache();
    this.callbacks.onHudUpdate(0, 0, 0, 3, 0);
  }

  public start(): void {
    if (this.active) return;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.active = true;
    this.handleResize();
    if (this.dead || (this.enemies.length === 0 && this.kills === 0 && this.score === 0)) {
      this.resetGame();
    }
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas);
    }

    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.active = false;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private onVisibilityChange(): void {
    if (!document.hidden) {
      this.lastTime = performance.now();
    }
  }

  private handleResize(): void {
    const cw = this.canvas.clientWidth;
    const ch = this.canvas.clientHeight;
    const rect = cw > 0 && ch > 0 ? { width: cw, height: ch } : this.canvas.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const targetW = Math.max(1, Math.round(rect.width * nextDpr));
    const targetH = Math.max(1, Math.round(rect.height * nextDpr));
    if (this.width === rect.width && this.height === rect.height && this.dpr === nextDpr && this.canvas.width === targetW && this.canvas.height === targetH) {
      return;
    }
    this.dpr = nextDpr;
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = targetW;
    this.canvas.height = targetH;
    this.rebuildBackdropCache();
  }

  private rebuildBackdropCache(): void {
    const { ctx, width, height } = this;
    if (width <= 0 || height <= 0) return;
    const cx = width / 2;
    const groundY = this.getGroundY();
    const tier = Math.floor(this.kills / 25) % 4;
    this.currentDojoTier = tier;

    const sky = ctx.createLinearGradient(0, -16, 0, groundY + 24);
    if (tier === 0) {
      sky.addColorStop(0, '#0f0718');
      sky.addColorStop(0.35, '#3b0a1b');
      sky.addColorStop(0.75, '#7f1d1d');
      sky.addColorStop(1, '#c2410c');
    } else if (tier === 1) {
      // Midnight Sapphire Temple
      sky.addColorStop(0, '#040818');
      sky.addColorStop(0.35, '#0f172a');
      sky.addColorStop(0.75, '#1e3a5f');
      sky.addColorStop(1, '#0284c7');
    } else if (tier === 2) {
      // Golden Dawn Pagoda
      sky.addColorStop(0, '#1c1026');
      sky.addColorStop(0.35, '#581c4f');
      sky.addColorStop(0.75, '#b45309');
      sky.addColorStop(1, '#f59e0b');
    } else {
      // Blood Eclipse Shrine
      sky.addColorStop(0, '#07030f');
      sky.addColorStop(0.35, '#2e0836');
      sky.addColorStop(0.75, '#6b1237');
      sky.addColorStop(1, '#be123c');
    }
    this.skyGrad = sky;

    const moonY = groundY - Math.min(125, height * 0.24);
    const moonR = Math.min(88, Math.max(54, Math.min(width, height) * 0.16));
    const glow = ctx.createRadialGradient(cx, moonY, moonR * 0.25, cx, moonY, moonR * 2.4);
    if (tier === 1) {
      glow.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
      glow.addColorStop(0.38, 'rgba(56, 189, 248, 0.62)');
      glow.addColorStop(0.65, 'rgba(14, 165, 233, 0.2)');
      glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    } else if (tier === 2) {
      glow.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      glow.addColorStop(0.38, 'rgba(251, 191, 36, 0.68)');
      glow.addColorStop(0.65, 'rgba(245, 158, 11, 0.22)');
      glow.addColorStop(1, 'rgba(120, 53, 15, 0)');
    } else {
      glow.addColorStop(0, 'rgba(254, 202, 202, 0.92)');
      glow.addColorStop(0.38, 'rgba(239, 68, 68, 0.68)');
      glow.addColorStop(0.65, 'rgba(220, 38, 38, 0.22)');
      glow.addColorStop(1, 'rgba(127, 29, 29, 0)');
    }
    this.moonGlowGrad = glow;

    const sheen = ctx.createRadialGradient(cx, groundY + 18, 10, cx, groundY + 46, Math.max(180, width * 0.55));
    sheen.addColorStop(0, tier === 1 ? 'rgba(56, 189, 248, 0.22)' : 'rgba(251, 146, 60, 0.24)');
    sheen.addColorStop(0.5, tier === 1 ? 'rgba(14, 165, 233, 0.08)' : 'rgba(220, 38, 38, 0.08)');
    sheen.addColorStop(1, 'rgba(15, 23, 42, 0)');
    this.floorSheenGrad = sheen;

    const lGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, 48);
    lGlow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
    lGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.16)');
    lGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
    this.lanternGlowGrad = lGlow;

    for (const p of this.petals) {
      if (p.x > width + 40) p.x = Math.random() * width;
      if (p.y > height + 40) p.y = Math.random() * height;
    }
  }

  private onKeyDown(ev: KeyboardEvent): void {
    if (!this.active || this.dead || this.paused || ev.repeat) return;
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') {
      ev.preventDefault();
      this.strike(-1);
    } else if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') {
      ev.preventDefault();
      this.strike(1);
    }
  }

  private onPointerDown(ev: PointerEvent): void {
    if (!this.active || this.dead || this.paused) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const halfW = rect.width > 0 ? rect.width / 2 : this.width / 2;
    const side: Side = px < halfW ? -1 : 1;
    this.strike(side);
  }

  private getStrikeRange(): number {
    const logicalW = Math.min(this.width > 0 ? this.width : 360, 520);
    const base = Math.min(156, Math.max(115, logicalW * 0.32));
    return this.weaponHits > 0 ? base + 55 : base;
  }

  private spawnDust(x: number, y: number, dir: Side, count = 4): void {
    for (let i = 0; i < count; i++) {
      if (this.dust.length >= 32) this.dust.shift();
      this.dust.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 6,
        vx: -dir * (35 + Math.random() * 65),
        vy: -(12 + Math.random() * 34),
        radius: 4 + Math.random() * 5,
        life: 0,
        maxLife: 0.28 + Math.random() * 0.14,
        alpha: 0.45 + Math.random() * 0.25,
      });
    }
  }

  private spawnImpactSparks(x: number, y: number, dir: Side, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= 64) this.sparks.shift();
      const spread = (Math.random() - 0.5) * Math.PI * 0.9;
      const baseAngle = dir === 1 ? 0 : Math.PI;
      const angle = baseAngle + spread;
      const speed = 150 + Math.random() * 280;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0,
        maxLife: 0.18 + Math.random() * 0.14,
        size: 2 + Math.random() * 2.5,
        color: i % 3 === 0 ? '#ffffff' : color,
      });
    }
  }

  private spawnPopup(x: number, y: number, text: string, color: string, scale = 1): void {
    if (this.popups.length >= 16) this.popups.shift();
    this.popups.push({
      x,
      y,
      vy: -58,
      text,
      color,
      scale,
      life: 0,
      maxLife: 0.72,
    });
  }

  private triggerShake(duration: number, magnitude: number): void {
    this.shakeTimer = Math.max(this.shakeTimer, duration);
    this.shakeMag = Math.max(this.shakeMag, magnitude);
  }

  private strike(side: Side): void {
    if (this.dead || this.paused || this.staggerTimer > 0 || this.width <= 0 || this.height <= 0) return;

    this.facing = side;
    this.lungePx = side * 26;
    this.lungeTimer = 0.16;
    this.attackStyle = this.attackStyle === 0 ? 1 : 0;

    const cx = this.width / 2;
    const groundY = this.getGroundY();
    const hadWeapon = this.weaponHits > 0;
    const range = this.getStrikeRange();

    // Footwork dash dust
    this.spawnDust(cx - side * 8, groundY + 14, side, 4);

    // Directional energy slash arc even on swing
    if (this.slashes.length >= 18) this.slashes.shift();
    this.slashes.push({
      x: cx + side * 26,
      y: groundY - 34,
      side,
      angle: this.attackStyle === 0 ? -0.45 : 0.4,
      radius: hadWeapon ? 74 : 52,
      color: hadWeapon ? '#fde047' : this.skin.aura,
      isWeapon: hadWeapon,
      life: 0,
      maxLife: 0.17,
    });

    let targetIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.side === side && e.dist <= range && e.dist < bestDist) {
        bestDist = e.dist;
        targetIdx = i;
      }
    }

    if (targetIdx < 0) {
      // Whiff
      this.combo = 0;
      this.staggerTimer = 0.22;
      this.spawnPopup(cx + side * 42, groundY - 76, 'MISS!', '#fca5a5', 0.9);
      this.callbacks.onWhiff();
      this.callbacks.onHudUpdate(this.score, this.kills, this.combo, this.hp, this.weaponHits);
      return;
    }

    const e = this.enemies[targetIdx];
    e.hp -= 1;
    e.flash = 0.14;
    if (this.weaponHits > 0) this.weaponHits--;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const isMilestone = this.combo >= 5 && this.combo % 5 === 0;
    const isCrit = hadWeapon || isMilestone || (e.hp <= 0 && e.kind !== 'ninja');
    const gained = 20 + Math.min(80, this.combo * 4) + (isCrit ? 15 : 0);
    this.score += gained;

    const hitX = cx + side * Math.min(bestDist, hadWeapon ? 110 : 82);
    const hitY = groundY - 38;

    // Impact VFX: shockwave ring + directional sparks + hit-stop + shake
    if (this.rings.length >= 16) this.rings.shift();
    this.rings.push({
      x: hitX,
      y: hitY,
      life: 0,
      maxLife: isCrit ? 0.24 : 0.18,
      radius: isCrit ? 62 : 44,
      color: isCrit ? '#fde047' : this.skin.aura,
    });
    this.spawnImpactSparks(hitX, hitY, side, isCrit ? '#fde047' : this.skin.aura, isCrit ? 12 : 7);

    this.hitStopTimer = e.hp <= 0 && e.kind === 'oni' ? 0.048 : isCrit ? 0.03 : 0.018;
    this.triggerShake(isCrit ? 0.14 : 0.08, isCrit ? 7.5 : 4.2);
    this.callbacks.onHit(this.combo, isCrit);

    if (e.hp <= 0) {
      this.kills++;
      const nextTier = Math.floor(this.kills / 25) % 4;
      if (nextTier !== this.currentDojoTier) {
        this.rebuildBackdropCache();
        const tierNames = ['CRIMSON DOJO', 'SAPPHIRE TEMPLE', 'GOLDEN PAGODA', 'ECLIPSE SHRINE'];
        this.spawnPopup(cx, groundY - 110, `✦ ${tierNames[nextTier]} ✦`, '#fde047', 1.25);
      }
      if (e.kind === 'oni') {
        this.weaponHits = 12;
        this.score += 100;
        this.callbacks.onBossKO?.();
        this.spawnPopup(hitX, hitY - 46, 'KATANA +100!', '#fde047', 1.25);
      } else if (isMilestone) {
        this.spawnPopup(hitX, hitY - 42, `COMBO x${this.combo}!`, '#fde047', 1.18);
      } else if (isCrit) {
        this.spawnPopup(hitX, hitY - 36, `CRIT +${gained}`, '#fb923c', 1.05);
      }

      if (this.bodies.length >= 24) this.bodies.shift();
      this.bodies.push({
        x: cx + e.side * e.dist,
        y: groundY - 24,
        vx: side * (280 + Math.random() * 150),
        vy: -(250 + Math.random() * 140),
        rot: 0,
        rotSpeed: side * (9 + Math.random() * 5),
        facing: e.side === 1 ? -1 : 1,
        color: e.kind === 'oni' ? '#dc2626' : e.kind === 'samurai' ? '#38bdf8' : '#334155',
        headband: e.kind === 'oni' ? '#facc15' : e.kind === 'samurai' ? '#0284c7' : '#ef4444',
        archetype: e.kind,
        life: 0,
        maxLife: 0.78,
      });
      this.enemies.splice(targetIdx, 1);
    } else {
      // Knockback + dust + possible side flip
      e.dist += 64;
      this.spawnDust(cx + e.side * e.dist, groundY + 14, side, 3);
      if (e.flipOnHit) {
        e.side = e.side === 1 ? -1 : 1;
      }
      if (isMilestone) {
        this.spawnPopup(hitX, hitY - 40, `COMBO x${this.combo}!`, '#fde047', 1.15);
      } else if (isCrit) {
        this.spawnPopup(hitX, hitY - 34, 'CRIT!', '#fb923c', 1.0);
      }
    }

    this.callbacks.onHudUpdate(this.score, this.kills, this.combo, this.hp, this.weaponHits);
  }

  private spawnEnemy(): void {
    // Normalize spawn distance across portrait & landscape for consistent reaction timing
    const startDist = Math.min(340, Math.max(this.width * 0.54, 230));
    const side: Side = Math.random() > 0.5 ? 1 : -1;
    const speedBase = 135 + Math.min(220, this.kills * 2.4);
    const roll = Math.random();
    let kind: EnemyKind = 'ninja';
    let hp = 1;
    let flipOnHit = false;

    if (this.kills >= 12 && roll > 0.86) {
      kind = 'oni';
      hp = 3;
      flipOnHit = true;
    } else if (this.kills >= 5 && roll > 0.62) {
      kind = 'samurai';
      hp = 2;
      flipOnHit = Math.random() > 0.4;
    }

    this.enemies.push({
      id: this.nextId++,
      side,
      dist: startDist,
      speed: (kind === 'ninja' ? speedBase * 1.05 : kind === 'oni' ? speedBase * 0.88 : speedBase) + Math.random() * 32,
      hp,
      maxHp: hp,
      kind,
      flipOnHit,
      flash: 0,
    });
  }

  private loop(now: number): void {
    if (!this.active) return;

    const rawDt = (now - this.lastTime) / 1000;
    const dt = this.paused ? 0 : (Number.isFinite(rawDt) ? Math.max(0, Math.min(rawDt, 0.05)) : 0);
    this.lastTime = now;
    this.clock += dt;

    if (this.width <= 0 || this.height <= 0) {
      this.handleResize();
      if (this.active) this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    if (this.paused) {
      this.draw();
      if (this.active) this.rafId = requestAnimationFrame(this.loop);
      return;
    }

    this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    if (this.shakeTimer <= 0) this.shakeMag = 0;
    this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);

    // Smooth camera parallax tracking player lunge
    const targetCamX = this.lungePx * 0.45;
    this.camX += (targetCamX - this.camX) * Math.min(1, dt * 16);

    // Hit-stop pauses combat motion briefly for crisp impact feel
    const simDt = this.hitStopTimer > 0 ? 0 : dt;
    this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);

    if (!this.dead && simDt > 0) {
      this.lungeTimer = Math.max(0, this.lungeTimer - simDt);
      if (this.lungeTimer <= 0) this.lungePx *= Math.pow(0.001, simDt);
      this.staggerTimer = Math.max(0, this.staggerTimer - simDt);

      this.spawnTimer -= simDt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnTimer = Math.max(0.28, 0.92 - Math.min(0.62, this.kills * 0.008));
      }

      const cx = this.width / 2;
      const groundY = this.getGroundY();

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.dist -= e.speed * simDt;
        e.flash = Math.max(0, e.flash - simDt);
        if (e.dist <= 22) {
          const hitSide = e.side;
          this.enemies.splice(i, 1);
          this.hp = Math.max(0, this.hp - 1);
          this.combo = 0;
          this.hurtFlashTimer = 0.22;
          this.triggerShake(0.24, 10);
          this.spawnDust(cx, groundY + 14, -hitSide as Side, 6);
          this.spawnPopup(cx, groundY - 82, '-1 HP', '#ef4444', 1.1);
          this.callbacks.onHurt();
          this.callbacks.onHudUpdate(this.score, this.kills, this.combo, this.hp, this.weaponHits);
          if (this.hp <= 0) {
            this.dead = true;
            this.callbacks.onGameOver(this.score, this.kills, this.maxCombo);
            break;
          }
        }
      }
    }

    // Update ambient petals & VFX even during hit-stop
    for (const p of this.petals) {
      p.phase += dt * p.spin;
      p.x += (p.vx + Math.sin(p.phase) * 14) * dt * p.depth;
      p.y += p.vy * dt * p.depth;
      if (p.y > this.height + 16) {
        p.y = -12;
        p.x = Math.random() * (this.width + 120);
      }
      if (p.x < -24) {
        p.x = this.width + 20;
      }
    }

    if (simDt > 0) {
      this.bodies = this.bodies.filter((b) => {
        b.life += simDt;
        b.vy += 940 * simDt;
        b.x += b.vx * simDt;
        b.y += b.vy * simDt;
        b.rot += b.rotSpeed * simDt;
        return b.life < b.maxLife;
      });
    }

    this.rings = this.rings.filter((r) => {
      r.life += dt;
      return r.life < r.maxLife;
    });

    this.slashes = this.slashes.filter((s) => {
      s.life += dt;
      return s.life < s.maxLife;
    });

    this.sparks = this.sparks.filter((s) => {
      s.life += dt;
      s.vx *= Math.pow(0.06, dt);
      s.vy += 320 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      return s.life < s.maxLife;
    });

    this.dust = this.dust.filter((d) => {
      d.life += dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.pow(0.15, dt);
      return d.life < d.maxLife;
    });

    this.popups = this.popups.filter((p) => {
      p.life += dt;
      p.y += p.vy * dt;
      p.vy *= Math.pow(0.2, dt);
      return p.life < p.maxLife;
    });

    this.draw();
    if (this.active) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  private drawParallaxBackdrop(cx: number, groundY: number): void {
    const { ctx, width, height, camX, clock } = this;

    // Sky gradient with overscan for screen shake
    ctx.fillStyle = this.skyGrad || '#3b0a1b';
    ctx.fillRect(-20, -20, width + 40, groundY + 44);

    // Subtle twilight stars
    ctx.fillStyle = '#fef2f2';
    for (const s of this.stars) {
      const twinkle = 0.25 + 0.45 * Math.abs(Math.sin(clock * 1.4 + s.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillRect(s.nx * width - camX * 0.05, s.ny * height, s.size, s.size);
    }
    ctx.globalAlpha = 1;

    // Glowing Crimson Moon + atmospheric bloom
    const moonX = cx - camX * 0.1;
    const moonY = groundY - Math.min(130, height * 0.22);
    const moonR = Math.min(96, Math.max(62, width * 0.17));

    if (this.moonGlowGrad) {
      ctx.save();
      ctx.translate(-camX * 0.1, 0);
      ctx.fillStyle = this.moonGlowGrad;
      ctx.beginPath();
      ctx.arc(cx, moonY, moonR * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Crisp moon disc
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 226, 226, 0.35)';
    ctx.beginPath();
    ctx.arc(moonX - moonR * 0.12, moonY - moonR * 0.1, moonR * 0.54, 0, Math.PI * 2);
    ctx.fill();

    // Drifting twilight mist bands across the moon
    ctx.fillStyle = 'rgba(69, 10, 10, 0.35)';
    const mistDrift = ((clock * 14) % (width + 240)) - 120;
    ctx.beginPath();
    ctx.ellipse(mistDrift, moonY + 14, 110, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width - mistDrift * 0.8, moonY - 22, 85, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Far Parallax Layer (0.16x): Mountain ridges + Pagoda Temple silhouette
    const farX = -camX * 0.16;
    ctx.fillStyle = '#240b18';
    ctx.beginPath();
    ctx.moveTo(-40, groundY + 16);
    ctx.lineTo(farX + width * 0.12, groundY - 72);
    ctx.lineTo(farX + width * 0.34, groundY - 28);
    ctx.lineTo(farX + width * 0.62, groundY - 82);
    ctx.lineTo(farX + width * 0.88, groundY - 38);
    ctx.lineTo(width + 40, groundY - 64);
    ctx.lineTo(width + 40, groundY + 16);
    ctx.closePath();
    ctx.fill();

    // Distant 3-tier Pagoda silhouette on left ridge
    const pagX = farX + Math.max(46, width * 0.17);
    const pagBaseY = groundY - 22;
    ctx.fillStyle = '#190712';
    for (let tier = 0; tier < 3; tier++) {
      const tw = 44 - tier * 9;
      const ty = pagBaseY - tier * 20;
      ctx.fillRect(pagX - tw * 0.32, ty - 14, tw * 0.64, 16);
      // Curved pagoda eaves
      ctx.beginPath();
      ctx.moveTo(pagX - tw * 0.65, ty - 12);
      ctx.quadraticCurveTo(pagX, ty - 22, pagX + tw * 0.65, ty - 12);
      ctx.lineTo(pagX + tw * 0.42, ty - 19);
      ctx.lineTo(pagX - tw * 0.42, ty - 19);
      ctx.closePath();
      ctx.fill();
    }
    // Pagoda spire
    ctx.fillRect(pagX - 1.5, pagBaseY - 78, 3, 22);

    // Mid Parallax Layer (0.34x): Torii Gate + Bamboo silhouettes
    const midX = -camX * 0.34;
    const toriiX = midX + Math.min(width - 48, cx + Math.min(140, width * 0.28));
    const toriiW = 68;
    const toriiH = 92;
    ctx.fillStyle = '#180913';
    // Torii pillars
    ctx.fillRect(toriiX - toriiW * 0.36, groundY - toriiH + 16, 7, toriiH);
    ctx.fillRect(toriiX + toriiW * 0.36 - 7, groundY - toriiH + 16, 7, toriiH);
    // Lower tie beam (nuki)
    ctx.fillRect(toriiX - toriiW * 0.48, groundY - toriiH + 34, toriiW * 0.96, 6);
    // Upper curved lintel (kasagi)
    ctx.beginPath();
    ctx.moveTo(toriiX - toriiW * 0.64, groundY - toriiH + 12);
    ctx.quadraticCurveTo(toriiX, groundY - toriiH + 22, toriiX + toriiW * 0.64, groundY - toriiH + 12);
    ctx.lineTo(toriiX + toriiW * 0.56, groundY - toriiH + 22);
    ctx.quadraticCurveTo(toriiX, groundY - toriiH + 27, toriiX - toriiW * 0.56, groundY - toriiH + 22);
    ctx.closePath();
    ctx.fill();

    // Dojo Foreground Timber Pillars & Eave Beam
    const pillarOffset = Math.min(196, width * 0.44);
    const leftPillarX = cx - pillarOffset - camX * 0.5;
    const rightPillarX = cx + pillarOffset - 16 - camX * 0.5;
    ctx.fillStyle = 'rgba(15, 10, 18, 0.78)';
    ctx.fillRect(leftPillarX, -16, 16, groundY + 32);
    ctx.fillRect(rightPillarX, -16, 16, groundY + 32);
    // Top crossbeam
    ctx.fillRect(-20, -16, width + 40, Math.max(22, height * 0.04));

    // Swinging Dojo Paper Lanterns (Chochin)
    const lanternPositions = [
      { x: leftPillarX + 26, y: Math.max(76, groundY * 0.36), phase: 0 },
      { x: rightPillarX - 10, y: Math.max(76, groundY * 0.36), phase: 1.8 },
    ];
    for (const l of lanternPositions) {
      const sway = Math.sin(clock * 1.9 + l.phase) * 0.08;
      ctx.save();
      ctx.translate(l.x, 0);
      ctx.rotate(sway);
      // Hanging cord
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(0, l.y - 16);
      ctx.stroke();

      // Warm radial lantern glow
      if (this.lanternGlowGrad) {
        ctx.save();
        ctx.translate(0, l.y);
        ctx.fillStyle = this.lanternGlowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Paper lantern body
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, l.y, 11, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.globalAlpha = 0.45 + Math.sin(clock * 6 + l.phase) * 0.08;
      ctx.beginPath();
      ctx.ellipse(0, l.y, 7, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      // Lantern caps & ribs
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, l.y - 16, 14, 3);
      ctx.fillRect(-7, l.y + 13, 14, 3);
      ctx.strokeStyle = 'rgba(69, 10, 10, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, l.y - 5);
      ctx.lineTo(10, l.y - 5);
      ctx.moveTo(-10, l.y + 5);
      ctx.lineTo(10, l.y + 5);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawDojoFloor(cx: number, groundY: number): void {
    const { ctx, width, height, camX } = this;
    const floorTop = groundY + 16;
    const floorH = height - floorTop + 24;

    // Dark oak wooden floor base
    ctx.fillStyle = '#181116';
    ctx.fillRect(-20, floorTop, width + 40, floorH);

    // Horizontal wood planks with subtle tone variation
    const plankStep = 22;
    for (let y = floorTop, row = 0; y < height + 20; y += plankStep, row++) {
      ctx.fillStyle = row % 2 === 0 ? 'rgba(69, 26, 18, 0.28)' : 'rgba(30, 15, 20, 0.32)';
      ctx.fillRect(-20, y, width + 40, plankStep - 1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(-20, y + plankStep - 1, width + 40, 1.2);

      // Staggered vertical plank seams (parallaxed slightly)
      const seamSpacing = 96;
      const offset = ((row % 3) * 34 - camX * 0.65) % seamSpacing;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let sx = offset - seamSpacing; sx < width + 40; sx += seamSpacing) {
        ctx.fillRect(sx, y, 1.5, plankStep);
      }
    }

    // Moonlit & lantern floor reflection sheen
    if (this.floorSheenGrad) {
      ctx.save();
      ctx.translate(-camX * 0.25, 0);
      ctx.fillStyle = this.floorSheenGrad;
      ctx.fillRect(-width * 0.3, floorTop, width * 1.6, Math.min(120, floorH));
      ctx.restore();
    }

    // Lacquered crimson-gold stage edge line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-20, floorTop);
    ctx.lineTo(width + 20, floorTop);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-20, floorTop + 3);
    ctx.lineTo(width + 20, floorTop + 3);
    ctx.stroke();

    // Strike range bars (Left & Right indicators)
    const range = this.getStrikeRange();
    for (const side of [-1, 1] as Side[]) {
      const hasTarget = this.enemies.some((e) => e.side === side && e.dist <= range);
      ctx.fillStyle = hasTarget ? 'rgba(250, 204, 21, 0.24)' : 'rgba(148, 163, 184, 0.08)';
      ctx.fillRect(side === -1 ? cx - range : cx, groundY - 4, range, 20);
      ctx.strokeStyle = hasTarget ? '#facc15' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = hasTarget ? 3.5 : 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + side * range, groundY - 12);
      ctx.lineTo(cx + side * range, groundY + 16);
      ctx.stroke();
    }
  }

  private drawSakuraPetals(): void {
    const { ctx } = this;
    ctx.save();
    for (const p of this.petals) {
      const flutter = Math.cos(p.phase * 1.3);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.phase * 0.45);
      ctx.scale(1, 0.45 + 0.55 * Math.abs(flutter));
      ctx.globalAlpha = 0.45 + p.depth * 0.35;
      ctx.fillStyle = p.depth > 0.78 ? '#fda4af' : '#f472b6';
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private draw(): void {
    const { ctx, width, height } = this;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    // Cleanly reset backing transform & clear buffer so shake never leaves stale edges
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.shakeTimer > 0 && this.shakeMag > 0) {
      const decay = Math.min(1, this.shakeTimer / 0.14);
      const sx = (Math.random() - 0.5) * 2 * this.shakeMag * decay;
      const sy = (Math.random() - 0.5) * 2 * this.shakeMag * decay;
      ctx.translate(sx, sy);
    }

    const cx = width / 2;
    const groundY = this.getGroundY();

    this.drawParallaxBackdrop(cx, groundY);
    this.drawDojoFloor(cx, groundY);
    this.drawSakuraPetals();

    // Tap zone hints near bottom (hidden on Game Over so they never overlap gameover-card)
    if (!this.dead) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.font = '800 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('◀ TAP LEFT', width * 0.25, height - 28);
      ctx.fillText('TAP RIGHT ▶', width * 0.75, height - 28);
    }

    // Katana Durability Bar when wielding Oni Katana
    if (this.weaponHits > 0 && !this.dead) {
      const barW = 128;
      const barH = 8;
      const bx = cx - barW / 2;
      const by = Math.max(height < 480 ? 64 : 114, groundY - 118);
      const frac = Math.min(1, this.weaponHits / 12);
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bx - 2, by - 2, barW + 4, barH + 4, 6);
      ctx.fill();
      const kGrad = ctx.createLinearGradient(bx, by, bx + barW, by);
      kGrad.addColorStop(0, '#f59e0b');
      kGrad.addColorStop(1, '#fef08a');
      ctx.fillStyle = kGrad;
      ctx.beginPath();
      ctx.roundRect(bx, by, barW * frac, barH, 4);
      ctx.fill();
      ctx.font = '800 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef08a';
      ctx.fillText(`⚔ KATANA (${this.weaponHits})`, cx, by - 5);
      ctx.restore();
    }

    // Dust puffs behind fighters
    for (const d of this.dust) {
      const t = d.life / d.maxLife;
      ctx.save();
      ctx.globalAlpha = d.alpha * (1 - t);
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius * (1 + t * 1.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemies
    for (const e of this.enemies) {
      const ex = cx + e.side * e.dist;
      const col =
        e.kind === 'oni'
          ? '#dc2626'
          : e.kind === 'samurai'
          ? '#38bdf8'
          : '#475569';
      const headband =
        e.kind === 'oni' ? '#facc15' : e.kind === 'samurai' ? '#0284c7' : '#ef4444';
      const belt = e.kind === 'oni' ? '#111827' : '#0f172a';
      drawMartialFighter(ctx, {
        x: ex,
        y: groundY,
        bodyColor: col,
        headbandColor: headband,
        beltColor: belt,
        facing: e.side === 1 ? -1 : 1,
        pose: 'walk',
        phase: this.clock + e.id * 0.4,
        archetype: e.kind,
        flash: e.flash > 0,
      });
      if (e.maxHp > 1) {
        const pipY = e.kind === 'oni' ? groundY - 98 : groundY - 82;
        for (let h = 0; h < e.hp; h++) {
          ctx.fillStyle = e.kind === 'oni' ? '#facc15' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(ex - (e.hp - 1) * 6 + h * 12, pipY, 4.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
    }

    // Knocked-out flying ragdolls
    for (const b of this.bodies) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - b.life / b.maxLife);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      drawMartialFighter(ctx, {
        x: 0,
        y: 26,
        scale: 0.94,
        bodyColor: b.color,
        headbandColor: b.headband,
        beltColor: '#0f172a',
        facing: b.facing,
        pose: 'ko',
        phase: this.clock,
        archetype: b.archetype,
      });
      ctx.restore();
    }

    // Player Fighter
    const playerCol = this.staggerTimer > 0 ? '#f87171' : this.skin.body;
    const pose =
      this.staggerTimer > 0
        ? 'hurt'
        : this.lungeTimer > 0
        ? this.attackStyle === 0
          ? 'punch'
          : 'kick'
        : 'idle';
    drawMartialFighter(ctx, {
      x: cx + this.lungePx,
      y: groundY,
      bodyColor: playerCol,
      headbandColor: this.skin.headband,
      beltColor: '#0f172a',
      facing: this.facing,
      pose,
      phase: this.clock,
      hasWeapon: this.weaponHits > 0,
      auraColor: this.skin.aura,
      archetype: 'player',
      flash: this.hurtFlashTimer > 0.14,
    });

    // Glowing directional slash arcs
    for (const s of this.slashes) {
      const t = s.life / s.maxLife;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(s.side, 1);
      ctx.rotate(s.angle);
      const startA = -0.95 + t * 0.35;
      const endA = 0.85 + t * 0.35;
      // Outer energy glow
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.isWeapon ? 14 * (1 - t * 0.4) : 10 * (1 - t * 0.4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-10, 0, s.radius, startA, endA);
      ctx.stroke();
      // White-hot slash core
      ctx.globalAlpha = alpha * 0.92;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = s.isWeapon ? 4.5 * (1 - t * 0.5) : 3 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.arc(-10, 0, s.radius, startA + 0.08, endA - 0.05);
      ctx.stroke();
      ctx.restore();
    }

    // Expanding shockwave rings
    for (const r of this.rings) {
      const t = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - t) * 0.85);
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 * (1 - t * 0.7);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + t * r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Directional hit sparks
    for (const sp of this.sparks) {
      const t = sp.life / sp.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = sp.color;
      ctx.lineWidth = sp.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(sp.x - sp.vx * 0.032, sp.y - sp.vy * 0.032);
      ctx.stroke();
      ctx.restore();
    }

    // Floating combat popups (COMBO x10!, CRIT!, KATANA +100!, etc.)
    ctx.textAlign = 'center';
    for (const p of this.popups) {
      const t = p.life / p.maxLife;
      const popScale = p.scale * (t < 0.15 ? 0.8 + (t / 0.15) * 0.35 : 1.15 - (t - 0.15) * 0.18);
      ctx.save();
      ctx.globalAlpha = t > 0.65 ? Math.max(0, (1 - t) / 0.35) : 1;
      ctx.translate(p.x, p.y);
      ctx.scale(popScale, popScale);
      ctx.font = '900 15px sans-serif';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }

    // Hurt red vignette overlay
    if (this.hurtFlashTimer > 0) {
      ctx.fillStyle = `rgba(220, 38, 38, ${Math.min(0.28, this.hurtFlashTimer * 1.2)})`;
      ctx.fillRect(-20, -20, width + 40, height + 40);
    }

    ctx.restore();
  }
}
