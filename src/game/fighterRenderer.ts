export type FighterPose = 'idle' | 'walk' | 'punch' | 'kick' | 'ko' | 'hurt';
export type FighterArchetype = 'player' | 'ninja' | 'samurai' | 'oni';

export interface DrawFighterOpts {
  x: number;
  y: number;
  scale?: number;
  bodyColor: string;
  headbandColor?: string;
  beltColor?: string;
  facing: -1 | 1;
  pose: FighterPose;
  phase?: number;
  hasWeapon?: boolean;
  auraColor?: string;
  archetype?: FighterArchetype;
  flash?: boolean;
}

interface Pt {
  x: number;
  y: number;
}

function drawLimbSegment(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  thickness: number,
  color: string,
  outlineColor?: string
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (outlineColor) {
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = thickness + 2;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawKatanaBlade(
  ctx: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  curveLift: number,
  flash: boolean,
  glowColor?: string,
  hiltColor = '#dc2626'
): void {
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular for slight katana curve & tsuba
  const px = -uy;
  const py = ux;

  const pommel: Pt = { x: grip.x - ux * 8, y: grip.y - uy * 8 };
  const tsuba: Pt = { x: grip.x + ux * 3, y: grip.y + uy * 3 };
  const mid: Pt = {
    x: (tsuba.x + tip.x) * 0.5 + px * curveLift,
    y: (tsuba.y + tip.y) * 0.5 + py * curveLift,
  };

  if (glowColor && !flash) {
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tsuba.x, tsuba.y);
    ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    ctx.stroke();
  }

  // Tsuka (wrapped hilt)
  ctx.strokeStyle = flash ? '#ffffff' : '#0f172a';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pommel.x, pommel.y);
  ctx.lineTo(tsuba.x, tsuba.y);
  ctx.stroke();

  if (!flash) {
    // Diamond wrap highlights
    ctx.strokeStyle = hiltColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pommel.x + ux * 2, pommel.y + uy * 2);
    ctx.lineTo(tsuba.x - ux * 1.5, tsuba.y - uy * 1.5);
    ctx.stroke();
  }

  // Spine of blade
  ctx.strokeStyle = flash ? '#ffffff' : '#94a3b8';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(tsuba.x, tsuba.y);
  ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
  ctx.stroke();

  // Gleaming bevel edge
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(tsuba.x - px * 0.8, tsuba.y - py * 0.8);
  ctx.quadraticCurveTo(mid.x - px * 0.9, mid.y - py * 0.9, tip.x, tip.y);
  ctx.stroke();

  // Tsuba handguard
  ctx.strokeStyle = flash ? '#ffffff' : '#facc15';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(tsuba.x - px * 4.5, tsuba.y - py * 4.5);
  ctx.lineTo(tsuba.x + px * 4.5, tsuba.y + py * 4.5);
  ctx.stroke();
}

function drawKunai(
  ctx: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  flash: boolean,
  wrapColor: string
): void {
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const ring: Pt = { x: grip.x - ux * 5, y: grip.y - uy * 5 };
  const base: Pt = { x: grip.x + ux * 3, y: grip.y + uy * 3 };
  const shoulder: Pt = { x: base.x + ux * 4.5, y: base.y + uy * 4.5 };

  // Pommel ring
  ctx.strokeStyle = flash ? '#ffffff' : '#94a3b8';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, 2.2, 0, Math.PI * 2);
  ctx.stroke();

  // Wrapped handle
  ctx.strokeStyle = flash ? '#ffffff' : wrapColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ring.x + ux * 2, ring.y + uy * 2);
  ctx.lineTo(base.x, base.y);
  ctx.stroke();

  // Diamond bevel blade
  ctx.fillStyle = flash ? '#ffffff' : '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(shoulder.x + px * 3.4, shoulder.y + py * 3.4);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(shoulder.x - px * 3.4, shoulder.y - py * 3.4);
  ctx.closePath();
  ctx.fill();

  if (!flash) {
    // Gleaming upper bevel ridge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  }
}

function drawKanaboClub(
  ctx: CanvasRenderingContext2D,
  grip: Pt,
  tip: Pt,
  flash: boolean
): void {
  const dx = tip.x - grip.x;
  const dy = tip.y - grip.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const base: Pt = { x: grip.x - ux * 6, y: grip.y - uy * 6 };
  const clubStart: Pt = { x: grip.x + ux * 6, y: grip.y + uy * 6 };

  // Iron-shod oak handle
  ctx.strokeStyle = flash ? '#ffffff' : '#451a03';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(clubStart.x, clubStart.y);
  ctx.stroke();

  // Tapered heavy iron barrel
  ctx.fillStyle = flash ? '#ffffff' : '#334155';
  ctx.beginPath();
  ctx.moveTo(clubStart.x - px * 2.5, clubStart.y - py * 2.5);
  ctx.lineTo(tip.x - px * 5.2, tip.y - py * 5.2);
  ctx.lineTo(tip.x + ux * 2.5, tip.y + uy * 2.5);
  ctx.lineTo(tip.x + px * 5.2, tip.y + py * 5.2);
  ctx.lineTo(clubStart.x + px * 2.5, clubStart.y + py * 2.5);
  ctx.closePath();
  ctx.fill();

  if (!flash) {
    // Metallic bands & gleaming iron studs
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    for (const frac of [0.3, 0.55, 0.8]) {
      const mx = clubStart.x + (tip.x - clubStart.x) * frac;
      const my = clubStart.y + (tip.y - clubStart.y) * frac;
      const halfW = 2.6 + frac * 2.6;
      ctx.beginPath();
      ctx.moveTo(mx - px * halfW, my - py * halfW);
      ctx.lineTo(mx + px * halfW, my + py * halfW);
      ctx.stroke();

      // Spikes on both sides
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(mx - px * (halfW + 1.5), my - py * (halfW + 1.5), 1.6, 0, Math.PI * 2);
      ctx.arc(mx + px * (halfW + 1.5), my + py * (halfW + 1.5), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Gold pommel ring
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(base.x, base.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMartialFighter(
  ctx: CanvasRenderingContext2D,
  opts: DrawFighterOpts
): void {
  const {
    x,
    y,
    scale = 1,
    bodyColor,
    headbandColor,
    beltColor = '#0f172a',
    facing,
    pose,
    phase = 0,
    hasWeapon = false,
    auraColor,
    archetype = 'player',
    flash = false,
  } = opts;

  const isOni = archetype === 'oni';
  const isSamurai = archetype === 'samurai';
  const isNinja = archetype === 'ninja';
  const isPlayer = archetype === 'player';

  const archScale = isOni ? 1.25 : isSamurai ? 1.09 : isNinja ? 0.97 : 1;
  const totalScale = scale * archScale;

  const fillCol = flash ? '#ffffff' : bodyColor;
  const trimCol = flash ? '#ffffff' : headbandColor || '#ef4444';
  const darkCol = flash ? '#fef08a' : beltColor;
  const outlineCol = flash ? '#ffffff' : 'rgba(10, 12, 20, 0.72)';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(totalScale * facing, totalScale);

  const walkSpeed = isNinja ? 14 : isOni ? 9.5 : 11.5;
  const bob =
    pose === 'walk'
      ? Math.abs(Math.sin(phase * walkSpeed)) * (isNinja ? -4.5 : -3.5)
      : pose === 'idle'
      ? Math.sin(phase * 4.2) * 1.6
      : 0;
  const forwardLean =
    pose === 'walk' && isNinja ? 0.16 : pose === 'punch' ? 0.12 : pose === 'hurt' ? -0.14 : 0;

  ctx.translate(0, bob);
  if (forwardLean !== 0) ctx.rotate(forwardLean);

  // Energy aura for player attacks / weapon boost / oni boss
  if (!flash && (isOni || (auraColor && (pose === 'punch' || pose === 'kick' || hasWeapon)))) {
    ctx.save();
    const auraPulse = 0.22 + Math.sin(phase * 12) * 0.06;
    ctx.globalAlpha = isOni ? auraPulse : hasWeapon ? 0.34 : 0.26;
    ctx.fillStyle = isOni ? '#ef4444' : auraColor || '#fde047';
    ctx.beginPath();
    ctx.ellipse(0, -34, isOni ? 33 : 28, isOni ? 43 : 37, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow (skip when airborne KO)
  if (pose !== 'ko') {
    ctx.save();
    if (forwardLean !== 0) ctx.rotate(-forwardLean);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 17.5 - bob, isOni ? 24 : 19, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const stride = pose === 'walk' ? Math.sin(phase * walkSpeed) * (isNinja ? 12 : 10) : 0;
  const legW = isOni ? 8.6 : isSamurai ? 7.8 : 7.0;
  const armW = isOni ? 7.6 : 6.2;

  // Compute articulated joint coordinates
  const bHip: Pt = { x: -3.5, y: -13 };
  const fHip: Pt = { x: 3.5, y: -13 };
  let bKnee: Pt;
  let bFoot: Pt;
  let fKnee: Pt;
  let fFoot: Pt;

  if (pose === 'ko') {
    bKnee = { x: -16, y: 1 };
    bFoot = { x: -25, y: 13 };
    fKnee = { x: 16, y: -1 };
    fFoot = { x: 24, y: 14 };
  } else if (pose === 'kick') {
    bKnee = { x: -10, y: 2 };
    bFoot = { x: -12, y: 16 };
    fKnee = { x: 22, y: -25 };
    fFoot = { x: 40, y: -32 };
  } else if (pose === 'punch') {
    bKnee = { x: -14, y: 2 };
    bFoot = { x: -19, y: 16 };
    fKnee = { x: 13, y: 1 };
    fFoot = { x: 17, y: 16 };
  } else {
    bKnee = { x: -8 - stride * 0.55, y: 2 };
    bFoot = { x: -10 - stride, y: 16 };
    fKnee = { x: 8 + stride * 0.55, y: 2 };
    fFoot = { x: 11 + stride, y: 16 };
  }

  const bShoulder: Pt = { x: -6, y: -37 };
  const fShoulder: Pt = { x: 6, y: -37 };
  let bElbow: Pt;
  let bHand: Pt;
  let fElbow: Pt;
  let fHand: Pt;

  if (pose === 'ko') {
    bElbow = { x: -15, y: -43 };
    bHand = { x: -24, y: -49 };
    fElbow = { x: 15, y: -42 };
    fHand = { x: 24, y: -47 };
  } else if (pose === 'punch') {
    bElbow = { x: -14, y: -28 };
    bHand = { x: -5, y: -24 };
    fElbow = { x: 20, y: -37 };
    fHand = { x: 36, y: -37 };
  } else if (pose === 'kick') {
    bElbow = { x: -13, y: -32 };
    bHand = { x: -19, y: -26 };
    fElbow = { x: 15, y: -42 };
    fHand = { x: 22, y: -35 };
  } else if (pose === 'hurt') {
    bElbow = { x: -12, y: -39 };
    bHand = { x: -18, y: -44 };
    fElbow = { x: 11, y: -40 };
    fHand = { x: 15, y: -45 };
  } else if (isNinja && pose === 'walk') {
    bElbow = { x: -15, y: -31 };
    bHand = { x: -24, y: -25 };
    const g = Math.cos(phase * walkSpeed) * 2.5;
    fElbow = { x: 15 + g, y: -28 };
    fHand = { x: 20 + g, y: -36 };
  } else {
    const g = pose === 'walk' ? Math.cos(phase * walkSpeed) * 3 : Math.sin(phase * 4.2) * 1.2;
    bElbow = { x: -13, y: -27 };
    bHand = { x: -7, y: -21 };
    fElbow = { x: 15 + g, y: -27 };
    fHand = { x: 19 + g, y: -36 };
  }

  // Helper to draw a detailed leg with trousers, shin guards, and waraji/tabi footwear
  const drawDetailedLeg = (hip: Pt, knee: Pt, foot: Pt, isBack: boolean) => {
    const trouserCol = flash ? '#ffffff' : isNinja ? '#1e293b' : isOni ? '#291518' : fillCol;
    drawLimbSegment(ctx, hip, knee, legW, trouserCol, outlineCol);
    drawLimbSegment(ctx, knee, foot, legW * 0.84, trouserCol, outlineCol);

    if (!flash) {
      // Darken back leg for crisp depth separation
      if (isBack) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = legW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hip.x, hip.y);
        ctx.lineTo(knee.x, knee.y);
        ctx.lineTo(foot.x, foot.y);
        ctx.stroke();
      }

      // Shin guard / leg wraps
      const shinStart: Pt = {
        x: knee.x + (foot.x - knee.x) * 0.2,
        y: knee.y + (foot.y - knee.y) * 0.2,
      };
      const shinEnd: Pt = {
        x: knee.x + (foot.x - knee.x) * 0.78,
        y: knee.y + (foot.y - knee.y) * 0.78,
      };
      if (isSamurai || isOni) {
        // Armored suneate shin plate + knee guard
        ctx.strokeStyle = isOni ? '#78350f' : '#334155';
        ctx.lineWidth = legW * 0.92;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shinStart.x, shinStart.y);
        ctx.lineTo(shinEnd.x, shinEnd.y);
        ctx.stroke();
        ctx.fillStyle = isOni ? '#facc15' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(knee.x + 1, knee.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Traditional martial arts shin wrap / bandages
        ctx.strokeStyle = isNinja ? trimCol : 'rgba(15, 23, 42, 0.45)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(shinStart.x - 2.5, shinStart.y);
        ctx.lineTo(shinStart.x + 2.5, shinStart.y + 2);
        ctx.moveTo(shinEnd.x - 2.5, shinEnd.y - 2);
        ctx.lineTo(shinEnd.x + 2.5, shinEnd.y);
        ctx.stroke();
      }

      // Tabi boot / Waraji sandal
      ctx.fillStyle = isPlayer ? '#0f172a' : isOni ? '#1c1917' : '#090d16';
      ctx.beginPath();
      ctx.ellipse(foot.x + 2.2, foot.y + 0.8, 5.2, 3.1, pose === 'kick' ? -0.35 : 0, 0, Math.PI * 2);
      ctx.fill();
      // Sandal/ankle strap highlight
      ctx.strokeStyle = isPlayer ? trimCol : '#cbd5e1';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(foot.x - 2, foot.y - 1);
      ctx.lineTo(foot.x + 3.5, foot.y + 1.5);
      ctx.stroke();
    }
  };

  // Helper to draw a detailed arm with sleeve, forearm bracer/tape, and fighting fist
  const drawDetailedArm = (shoulder: Pt, elbow: Pt, hand: Pt, isBack: boolean) => {
    const sleeveCol = flash ? '#ffffff' : isOni ? '#991b1b' : isSamurai ? '#1e293b' : fillCol;
    const forearmCol = flash ? '#ffffff' : isPlayer ? '#fde68a' : isOni ? '#b91c1c' : fillCol;

    drawLimbSegment(ctx, shoulder, elbow, armW, sleeveCol, outlineCol);
    drawLimbSegment(ctx, elbow, hand, armW * 0.82, forearmCol, outlineCol);

    if (!flash) {
      if (isBack) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.lineWidth = armW;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.lineTo(elbow.x, elbow.y);
        ctx.lineTo(hand.x, hand.y);
        ctx.stroke();
      }

      // Forearm bracers / wrist wraps
      const wrapA: Pt = {
        x: elbow.x + (hand.x - elbow.x) * 0.45,
        y: elbow.y + (hand.y - elbow.y) * 0.45,
      };
      const wrapB: Pt = {
        x: elbow.x + (hand.x - elbow.x) * 0.82,
        y: elbow.y + (hand.y - elbow.y) * 0.82,
      };
      ctx.strokeStyle = isSamurai ? '#475569' : isOni ? '#450a0a' : isNinja ? trimCol : '#f8fafc';
      ctx.lineWidth = armW * 0.9;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(wrapA.x, wrapA.y);
      ctx.lineTo(wrapB.x, wrapB.y);
      ctx.stroke();

      // Fist / fingerless fighting glove
      const gloveCol = isPlayer ? trimCol : isOni ? '#7f1d1d' : '#1e293b';
      ctx.fillStyle = gloveCol;
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, isOni ? 4.8 : 3.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  // 1. Back leg & back arm
  drawDetailedLeg(bHip, bKnee, bFoot, true);
  drawDetailedArm(bShoulder, bElbow, bHand, true);

  // 2. Front leg
  drawDetailedLeg(fHip, fKnee, fFoot, false);

  // 3. Torso (shaded gi / armor + hip tassets)
  const shoulderW = isOni ? 15 : isSamurai ? 13 : isNinja ? 10.5 : 11.5;
  const waistW = isOni ? 11.2 : isSamurai ? 10.2 : 8.8;

  ctx.fillStyle = fillCol;
  ctx.strokeStyle = outlineCol;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-shoulderW, -42);
  ctx.lineTo(shoulderW, -42);
  ctx.lineTo(waistW, -12);
  ctx.lineTo(-waistW, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (!flash) {
    // Directional torso shading (back half slightly shaded)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.moveTo(-shoulderW, -42);
    ctx.lineTo(0, -42);
    ctx.lineTo(-1, -12);
    ctx.lineTo(-waistW, -12);
    ctx.closePath();
    ctx.fill();
  }

  // Samurai / Oni Layered Lamellar Armor & Hip Tassets (Kusazuri)
  if (isSamurai || isOni) {
    const plateCol = flash ? '#ffffff' : isOni ? '#450a0a' : '#1e293b';
    const laceCol = flash ? '#ffffff' : isOni ? '#facc15' : '#64748b';
    ctx.fillStyle = plateCol;
    ctx.beginPath();
    ctx.moveTo(-shoulderW + 1, -41);
    ctx.lineTo(shoulderW - 1, -41);
    ctx.lineTo(waistW - 0.5, -20);
    ctx.lineTo(-waistW + 0.5, -20);
    ctx.closePath();
    ctx.fill();

    if (!flash) {
      // 3 Horizontal lamellar armor tiers + vertical odoshi lacing
      ctx.strokeStyle = laceCol;
      ctx.lineWidth = 1.5;
      for (const ty of [-35, -29.5, -24.5]) {
        const hw = waistW + ((shoulderW - waistW) * (-ty - 20)) / 21 - 2;
        ctx.beginPath();
        ctx.moveTo(-hw, ty);
        ctx.lineTo(hw, ty);
        ctx.stroke();
      }
      // Center chest crest emblem
      ctx.fillStyle = isOni ? '#facc15' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(1.5, -33, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Hip armor tassets (kusazuri)
      ctx.fillStyle = plateCol;
      ctx.strokeStyle = laceCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-waistW - 1, -17);
      ctx.lineTo(waistW + 1, -17);
      ctx.lineTo(waistW + 3.5, -9);
      ctx.lineTo(-waistW - 3.5, -9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Layered shoulder sode plates
    const drawSode = (sx: number, dir: -1 | 1) => {
      ctx.fillStyle = trimCol;
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx, -43);
      ctx.lineTo(sx + dir * 7, -41);
      ctx.lineTo(sx + dir * 8, -32);
      ctx.lineTo(sx - dir * 1, -32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!flash) {
        ctx.strokeStyle = laceCol;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, -37);
        ctx.lineTo(sx + dir * 7.2, -36);
        ctx.stroke();
      }
    };
    drawSode(-shoulderW + 2, -1);
    drawSode(shoulderW - 2, 1);
  } else if (isNinja) {
    // Ninja diagonal chest strap (tasuki), tunic folds & kunai pouch
    if (!flash) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-7, -30);
      ctx.lineTo(5, -24);
      ctx.stroke();

      // Diagonal sash strap
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-shoulderW + 2, -41);
      ctx.lineTo(waistW - 1, -18);
      ctx.stroke();

      // Spare kunai hilt peeking from back shoulder
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-shoulderW + 1, -42);
      ctx.lineTo(-shoulderW - 5, -50);
      ctx.stroke();
    }
  } else {
    // Player crisp overlapping Gi V-lapels + collar trim + lower gi skirt
    if (!flash) {
      // Lower gi skirt fold
      ctx.fillStyle = fillCol;
      ctx.strokeStyle = outlineCol;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-waistW, -16);
      ctx.lineTo(waistW, -16);
      ctx.lineTo(waistW + 2.5, -8.5);
      ctx.lineTo(1, -9.5);
      ctx.lineTo(-waistW - 2, -8.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Overlapping V-neck lapels (left-over-right) + inner chest skin triangle
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(-4, -42);
      ctx.lineTo(5, -42);
      ctx.lineTo(1.5, -31);
      ctx.closePath();
      ctx.fill();

      // Collar trim strokes
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-5.5, -42);
      ctx.lineTo(2.5, -27);
      ctx.moveTo(5.5, -42);
      ctx.lineTo(0.5, -31);
      ctx.stroke();
    }
  }

  // Waist Obi Belt + Knot + Animated Fluttering Tails
  ctx.fillStyle = isNinja ? trimCol : darkCol;
  ctx.fillRect(-waistW - 0.8, -20.5, (waistW + 0.8) * 2, 4.8);
  if (!flash) {
    // Center obi knot
    ctx.fillStyle = isNinja ? trimCol : darkCol;
    ctx.beginPath();
    ctx.arc(2.5, -18, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Fluttering obi belt tails
    const flutter = Math.sin(phase * 10) * 3;
    ctx.strokeStyle = isNinja ? trimCol : darkCol;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, -17);
    ctx.quadraticCurveTo(8, -12, 9 + flutter * 0.4, -5);
    ctx.moveTo(1.5, -17);
    ctx.quadraticCurveTo(-2, -11, -4 - flutter * 0.4, -5);
    ctx.stroke();
  }

  // 4. Head, Face & Archetype Headgear
  const headR = isOni ? 12.6 : 11.4;
  const headY = isOni ? -55 : -54;
  const skinCol = flash ? '#ffffff' : isPlayer ? '#fde68a' : isOni ? '#dc2626' : fillCol;

  // Neck
  ctx.fillStyle = skinCol;
  ctx.fillRect(-3.8, -45, 7.6, 5);

  // Head base
  ctx.fillStyle = skinCol;
  ctx.strokeStyle = outlineCol;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isNinja) {
    // Ninja shinobi cowl/hood + lower face mask (fukumen)
    ctx.fillStyle = flash ? '#ffffff' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, headY, headR + 0.7, Math.PI * 0.78, Math.PI * 2.18);
    ctx.fill();
    // Face mask lower wrap
    ctx.fillStyle = flash ? '#ffffff' : '#1e293b';
    ctx.beginPath();
    ctx.arc(0, headY + 1.2, headR + 0.2, 0.02, Math.PI - 0.02);
    ctx.fill();
    if (!flash) {
      // Mask fold & glowing focused eyes
      ctx.strokeStyle = trimCol;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-4, headY + 3);
      ctx.lineTo(10, headY + 1);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(2.5, headY - 2.2);
      ctx.lineTo(9.8, headY - 4);
      ctx.lineTo(8.2, headY - 0.5);
      ctx.closePath();
      ctx.fill();
    }
  } else if (isSamurai) {
    // Detailed Kabuto Helmet + Shikoro Neck Guard + Gold Kuwagata + Menpo Mask
    ctx.fillStyle = flash ? '#ffffff' : '#1e293b';
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, headY - 1, headR + 2.2, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.stroke();

    // Multi-tier flared shikoro neck guard
    ctx.beginPath();
    ctx.moveTo(-headR - 2, headY - 1);
    ctx.lineTo(-headR - 6.5, headY + 9);
    ctx.lineTo(-3, headY + 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      // Menpo lacquered face mask on lower jaw
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0.5, headY + 2, headR - 0.6, 0.05, Math.PI * 0.85);
      ctx.fill();
      // Stern Samurai eyes & brow
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(2, headY - 4.2, 8, 4.2);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(5, headY - 3, 3.2, 2);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(2, headY - 4.5);
      ctx.lineTo(10, headY - 5.5);
      ctx.stroke();

      // Gold Kuwagata horns + central crest (maedate)
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(6, headY - 9);
      ctx.quadraticCurveTo(12, headY - 16, 15, headY - 23);
      ctx.moveTo(4, headY - 9);
      ctx.quadraticCurveTo(0, headY - 16, -3, headY - 22);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(5, headY - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (isOni) {
    // Wild dark mane + fierce Oni mask + twin curved textured horns + fangs
    if (!flash) {
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(-8, headY - 8);
      ctx.lineTo(-17, headY - 14);
      ctx.lineTo(-13, headY - 3);
      ctx.lineTo(-19, headY + 2);
      ctx.lineTo(-9, headY + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Demon lower jaw plate
    ctx.fillStyle = flash ? '#ffffff' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, headY + 2.5, headR - 0.5, -0.15, Math.PI + 0.15);
    ctx.fill();

    // Twin curved horns with ridge markings
    ctx.fillStyle = flash ? '#ffffff' : '#fef08a';
    ctx.strokeStyle = outlineCol;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(4, headY - 9);
    ctx.quadraticCurveTo(11, headY - 23, 18, headY - 26);
    ctx.quadraticCurveTo(10, headY - 15, 8.5, headY - 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-2, headY - 10);
    ctx.quadraticCurveTo(2, headY - 24, 7, headY - 28);
    ctx.quadraticCurveTo(4, headY - 17, 2.5, headY - 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (!flash) {
      // Glowing amber Oni eye + heavy demon brow
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(3, headY - 2.2);
      ctx.lineTo(10.8, headY - 4.8);
      ctx.lineTo(9.2, headY + 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(1.5, headY - 5);
      ctx.lineTo(11, headY - 6.8);
      ctx.stroke();

      // Jutting fangs
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(4.5, headY + 7.5);
      ctx.lineTo(6.5, headY + 2.5);
      ctx.lineTo(8.5, headY + 7.5);
      ctx.moveTo(9, headY + 6.8);
      ctx.lineTo(10.6, headY + 2.8);
      ctx.lineTo(11.6, headY + 6.8);
      ctx.fill();
    }
  } else {
    // Player Martial Artist Hair + Expressive Eyes, Brows & Battle Focus Mouth
    if (!flash) {
      // Styled dark martial artist hair crown
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, headY - 1.5, headR + 0.8, Math.PI * 0.88, Math.PI * 2.05);
      ctx.lineTo(headR - 2, headY - 5);
      ctx.lineTo(5, headY - 8);
      ctx.lineTo(0, headY - 5);
      ctx.closePath();
      ctx.fill();

      // Expressive Eyes & Brow
      if (pose === 'ko') {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, headY - 4);
        ctx.lineTo(8, headY + 1);
        ctx.moveTo(8, headY - 4);
        ctx.lineTo(3, headY + 1);
        ctx.stroke();
      } else if (pose === 'hurt') {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, headY - 3);
        ctx.lineTo(8.5, headY - 1);
        ctx.lineTo(3, headY + 1);
        ctx.stroke();
      } else {
        // Focused sclera + dark iris + fierce angled eyebrow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(6.2, headY - 1.5, 3.2, 2.0, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(7.1, headY - 1.5, 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2.5, headY - 4.2);
        ctx.lineTo(10, headY - 5.6);
        ctx.stroke();
      }

      // Expressive Mouth (kiai grit/shout on strike, calm focus on idle)
      if (pose === 'punch' || pose === 'kick') {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.ellipse(6, headY + 5, 3.2, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4.2, headY + 3.6, 3.6, 1.2);
      } else if (pose === 'hurt' || pose === 'ko') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(5.5, headY + 5.5, 2.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(3.5, headY + 5);
        ctx.lineTo(7.8, headY + 4.5);
        ctx.stroke();
      }
    }
  }

  // Hachimaki Headband + Twin Flowing Animated Tails (player & ninja)
  if ((headbandColor && !isSamurai && !isOni) || isNinja) {
    ctx.fillStyle = trimCol;
    ctx.fillRect(-headR, headY - 6.6, headR * 2, 4.8);
    if (!flash) {
      // Side knot
      ctx.beginPath();
      ctx.arc(-headR + 0.5, headY - 4.2, 2.8, 0, Math.PI * 2);
      ctx.fill();
      const tailWave1 = Math.sin(phase * 11) * 3.5;
      const tailWave2 = Math.cos(phase * 11) * 2.8;
      // Upper ribbon tail
      ctx.beginPath();
      ctx.moveTo(-headR, headY - 5);
      ctx.quadraticCurveTo(-headR - 9, headY - 12 + tailWave1, -headR - 17, headY - 8 + tailWave1);
      ctx.lineTo(-headR - 13, headY - 3 + tailWave1 * 0.7);
      ctx.closePath();
      ctx.fill();
      // Lower ribbon tail
      ctx.beginPath();
      ctx.moveTo(-headR, headY - 3);
      ctx.quadraticCurveTo(-headR - 8, headY - 3 + tailWave2, -headR - 15, headY + 1 + tailWave2);
      ctx.lineTo(-headR - 11, headY + 4 + tailWave2 * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 5. Front arm
  drawDetailedArm(fShoulder, fElbow, fHand, false);

  // 6. Archetype Weapons (when alive)
  if (pose !== 'ko') {
    if (isNinja) {
      drawKunai(ctx, fHand, { x: fHand.x + 15, y: fHand.y - 6 }, flash, trimCol);
    } else if (isSamurai) {
      drawKatanaBlade(
        ctx,
        fHand,
        { x: fHand.x + 25, y: fHand.y - 22 },
        -3,
        flash,
        undefined,
        '#0284c7'
      );
    } else if (isOni) {
      drawKanaboClub(ctx, fHand, { x: fHand.x + 22, y: fHand.y - 28 }, flash);
    }
  }

  // Impact Fist / Punch Energy Highlight
  if (pose === 'punch' && !flash) {
    ctx.fillStyle = trimCol || '#fde047';
    ctx.beginPath();
    ctx.arc(fHand.x + 1, fHand.y, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(fHand.x + 2, fHand.y - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player Katana Weapon Boost
  if (hasWeapon) {
    const isAttacking = pose === 'punch' || pose === 'kick';
    const tip: Pt = isAttacking
      ? { x: fHand.x + 30, y: fHand.y - 4 }
      : { x: fHand.x + 28, y: fHand.y - 20 };
    drawKatanaBlade(
      ctx,
      fHand,
      tip,
      isAttacking ? -2.5 : -3.5,
      flash,
      'rgba(250, 204, 21, 0.52)',
      trimCol
    );
  }

  ctx.restore();
}
