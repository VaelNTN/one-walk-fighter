import { FighterSkin } from '../data/fighters';
import { drawMartialFighter } from './fighterRenderer';

type Side = -1 | 1;
type EnemyKind = 'ninja' | 'brawler' | 'master';

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
  facing: Side;
  color: string;
  headband?: string;
  life: number;
}

interface SlashSpark {
  x: number;
  y: number;
  side: Side;
  life: number;
}

export interface FighterCallbacks {
  onHudUpdate: (score: number, kills: number, combo: number, hp: number, weaponHits: number) => void;
  onHit: (combo: number) => void;
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
  private rafId: number | null = null;
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
  private dead = false;

  private enemies: Enemy[] = [];
  private bodies: FlyBody[] = [];
  private sparks: SlashSpark[] = [];
  private nextId = 1;
  private spawnTimer = 0.6;

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

    this.handleResize = this.handleResize.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.loop = this.loop.bind(this);
  }

  public setSkin(skin: FighterSkin): void {
    this.skin = skin;
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
    this.dead = false;
    this.enemies = [];
    this.bodies = [];
    this.sparks = [];
    this.spawnTimer = 0.35;
    this.callbacks.onHudUpdate(0, 0, 0, 3, 0);
  }

  public start(): void {
    if (this.active) return;
    this.active = true;
    this.handleResize();
    if (this.dead || (this.enemies.length === 0 && this.kills === 0)) this.resetGame();
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.active = false;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
  }

  private onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'ArrowLeft' || ev.key === 'a' || ev.key === 'A') this.strike(-1);
    else if (ev.key === 'ArrowRight' || ev.key === 'd' || ev.key === 'D') this.strike(1);
  }

  private onPointerDown(ev: PointerEvent): void {
    ev.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const side: Side = px < this.width / 2 ? -1 : 1;
    this.strike(side);
  }

  private getStrikeRange(): number {
    const base = Math.min(160, Math.max(115, this.width * 0.32));
    return this.weaponHits > 0 ? base + 55 : base;
  }

  private strike(side: Side): void {
    if (this.dead || this.staggerTimer > 0) return;

    this.facing = side;
    this.lungePx = side * 24;
    this.lungeTimer = 0.16;
    this.attackStyle = this.attackStyle === 0 ? 1 : 0;
    const range = this.getStrikeRange();

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
      this.callbacks.onWhiff();
      this.callbacks.onHudUpdate(this.score, this.kills, this.combo, this.hp, this.weaponHits);
      return;
    }

    const e = this.enemies[targetIdx];
    e.hp -= 1;
    e.flash = 0.15;
    if (this.weaponHits > 0) this.weaponHits--;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += 20 + Math.min(80, this.combo * 4);
    this.shakeTimer = 0.08;

    const cx = this.width / 2;
    const groundY = this.height * 0.64;
    this.sparks.push({ x: cx + side * Math.min(bestDist, 75), y: groundY - 38, side, life: 0 });
    this.callbacks.onHit(this.combo);

    if (e.hp <= 0) {
      this.kills++;
      if (e.kind === 'master') {
        this.weaponHits = 12;
        this.score += 100;
      }
      this.bodies.push({
        x: cx + e.side * e.dist,
        y: groundY - 24,
        vx: side * (260 + Math.random() * 140),
        vy: -(240 + Math.random() * 140),
        rot: 0,
        facing: e.side === 1 ? -1 : 1,
        color: e.kind === 'master' ? '#facc15' : e.kind === 'brawler' ? '#38bdf8' : '#94a3b8',
        headband: e.kind === 'master' ? '#dc2626' : e.kind === 'brawler' ? '#0284c7' : '#ef4444',
        life: 0,
      });
      this.enemies.splice(targetIdx, 1);
    } else {
      // Knockback + possible flip side!
      e.dist += 62;
      if (e.flipOnHit) {
        e.side = e.side === 1 ? -1 : 1;
      }
    }

    this.callbacks.onHudUpdate(this.score, this.kills, this.combo, this.hp, this.weaponHits);
  }

  private spawnEnemy(): void {
    const startDist = Math.max(this.width * 0.56, 230);
    const side: Side = Math.random() > 0.5 ? 1 : -1;
    const speedBase = 135 + Math.min(220, this.kills * 2.4);
    const roll = Math.random();
    let kind: EnemyKind = 'ninja';
    let hp = 1;
    let flipOnHit = false;

    if (this.kills >= 12 && roll > 0.86) {
      kind = 'master';
      hp = 3;
      flipOnHit = true;
    } else if (this.kills >= 5 && roll > 0.62) {
      kind = 'brawler';
      hp = 2;
      flipOnHit = Math.random() > 0.4;
    }

    this.enemies.push({
      id: this.nextId++,
      side,
      dist: startDist,
      speed: speedBase + Math.random() * 35,
      hp,
      maxHp: hp,
      kind,
      flipOnHit,
      flash: 0,
    });
  }

  private loop(now: number): void {
    if (!this.active) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.clock += dt;

    if (!this.dead) {
      this.lungeTimer = Math.max(0, this.lungeTimer - dt);
      if (this.lungeTimer <= 0) this.lungePx *= Math.pow(0.001, dt);
      this.staggerTimer = Math.max(0, this.staggerTimer - dt);
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy();
        this.spawnTimer = Math.max(0.28, 0.92 - Math.min(0.62, this.kills * 0.008));
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.dist -= e.speed * dt;
        e.flash = Math.max(0, e.flash - dt);
        if (e.dist <= 22) {
          this.enemies.splice(i, 1);
          this.hp--;
          this.combo = 0;
          this.shakeTimer = 0.22;
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

    this.bodies = this.bodies.filter((b) => {
      b.life += dt;
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += 9 * dt;
      return b.life < 0.75;
    });

    this.sparks = this.sparks.filter((s) => {
      s.life += dt;
      return s.life < 0.16;
    });

    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private draw(): void {
    const { ctx, width, height } = this;
    if (width <= 0 || height <= 0) return;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    if (this.shakeTimer > 0) {
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }

    // Dojo backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#450a0a');
    grad.addColorStop(0.65, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const groundY = height * 0.64;

    // Dojo sunset moon
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, groundY - 90, 96, 0, Math.PI * 2);
    ctx.fill();

    // Subtle dojo pillars
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.fillRect(cx - Math.min(180, width * 0.42), 0, 14, groundY + 16);
    ctx.fillRect(cx + Math.min(180, width * 0.42) - 14, 0, 14, groundY + 16);

    // Strike range bars (Left & Right indicators)
    const range = this.getStrikeRange();
    for (const side of [-1, 1] as Side[]) {
      const hasTarget = this.enemies.some((e) => e.side === side && e.dist <= range);
      ctx.fillStyle = hasTarget ? 'rgba(250, 204, 21, 0.22)' : 'rgba(148, 163, 184, 0.08)';
      ctx.fillRect(side === -1 ? cx - range : cx, groundY - 6, range, 22);
      ctx.strokeStyle = hasTarget ? '#facc15' : 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + side * range, groundY - 12);
      ctx.lineTo(cx + side * range, groundY + 18);
      ctx.stroke();
    }

    // Floor walkway
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, groundY + 16, width, height - groundY);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 16);
    ctx.lineTo(width, groundY + 16);
    ctx.stroke();

    // Tap zone hints near bottom
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.font = '800 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀ TAP LEFT', width * 0.25, height - 36);
    ctx.fillText('TAP RIGHT ▶', width * 0.75, height - 36);

    // Enemies
    for (const e of this.enemies) {
      const ex = cx + e.side * e.dist;
      const col =
        e.flash > 0
          ? '#ffffff'
          : e.kind === 'master'
          ? '#facc15'
          : e.kind === 'brawler'
          ? '#38bdf8'
          : '#94a3b8';
      const headband =
        e.kind === 'master' ? '#dc2626' : e.kind === 'brawler' ? '#0284c7' : '#ef4444';
      const belt = e.kind === 'master' ? '#111827' : '#1e293b';
      drawMartialFighter(ctx, {
        x: ex,
        y: groundY,
        bodyColor: col,
        headbandColor: headband,
        beltColor: belt,
        facing: e.side === 1 ? -1 : 1,
        pose: 'walk',
        phase: this.clock + e.id * 0.4,
      });
      if (e.maxHp > 1) {
        for (let h = 0; h < e.hp; h++) {
          ctx.fillStyle = e.kind === 'master' ? '#facc15' : '#38bdf8';
          ctx.beginPath();
          ctx.arc(ex - (e.hp - 1) * 6 + h * 12, groundY - 78, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Knocked-out flying ragdolls
    for (const b of this.bodies) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - b.life / 0.75);
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      drawMartialFighter(ctx, {
        x: 0,
        y: 26,
        scale: 0.92,
        bodyColor: b.color,
        headbandColor: b.headband,
        beltColor: '#0f172a',
        facing: b.facing,
        pose: 'ko',
        phase: this.clock,
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
    });

    // Slash sparks
    for (const sp of this.sparks) {
      ctx.strokeStyle = this.skin.aura;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 12 + sp.life * 220, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
