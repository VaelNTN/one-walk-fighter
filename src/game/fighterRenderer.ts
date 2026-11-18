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
  const archScale = isOni ? 1.24 : isSamurai ? 1.08 : isNinja ? 0.96 : 1;
  const totalScale = scale * archScale;

  const fillCol = flash ? '#ffffff' : bodyColor;
  const trimCol = flash ? '#ffffff' : headbandColor || '#ef4444';
  const darkCol = flash ? '#fef08a' : beltColor;

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
    ctx.ellipse(0, -34, isOni ? 32 : 27, isOni ? 42 : 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow (skip when airborne KO)
  if (pose !== 'ko') {
    ctx.save();
    if (forwardLean !== 0) ctx.rotate(-forwardLean);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 17 - bob, isOni ? 23 : 18, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const stride = pose === 'walk' ? Math.sin(phase * walkSpeed) * (isNinja ? 12 : 10) : 0;

  // Back leg
  ctx.strokeStyle = fillCol;
  ctx.lineWidth = isOni ? 9 : isSamurai ? 8 : 7.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(-3, -12);
    ctx.lineTo(-18, 2);
    ctx.lineTo(-26, 13);
  } else if (pose === 'kick') {
    ctx.moveTo(-3, -13);
    ctx.lineTo(-10, 2);
    ctx.lineTo(-12, 16);
  } else if (pose === 'punch') {
    ctx.moveTo(-4, -13);
    ctx.lineTo(-14, 2);
    ctx.lineTo(-19, 16);
  } else {
    ctx.moveTo(-3, -13);
    ctx.lineTo(-8 - stride * 0.6, 2);
    ctx.lineTo(-10 - stride, 16);
  }
  ctx.stroke();

  // Front leg (or high kick)
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(3, -12);
    ctx.lineTo(17, 0);
    ctx.lineTo(24, 14);
  } else if (pose === 'kick') {
    ctx.moveTo(3, -15);
    ctx.lineTo(22, -26);
    ctx.lineTo(40, -33);
  } else if (pose === 'punch') {
    ctx.moveTo(4, -13);
    ctx.lineTo(14, 1);
    ctx.lineTo(18, 16);
  } else {
    ctx.moveTo(3, -13);
    ctx.lineTo(8 + stride * 0.6, 2);
    ctx.lineTo(11 + stride, 16);
  }
  ctx.stroke();

  // Back arm
  ctx.lineWidth = isOni ? 8 : 6.4;
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(-5, -36);
    ctx.lineTo(-23, -49);
  } else if (pose === 'punch') {
    ctx.moveTo(-5, -35);
    ctx.lineTo(-14, -27);
    ctx.lineTo(-6, -23);
  } else if (pose === 'kick') {
    ctx.moveTo(-5, -35);
    ctx.lineTo(-18, -28);
  } else if (pose === 'hurt') {
    ctx.moveTo(-5, -36);
    ctx.lineTo(-17, -43);
  } else if (isNinja && pose === 'walk') {
    // Classic shinobi trailing arm
    ctx.moveTo(-5, -35);
    ctx.lineTo(-22, -26);
  } else {
    ctx.moveTo(-4, -35);
    ctx.lineTo(-13, -25);
    ctx.lineTo(-8, -19);
  }
  ctx.stroke();

  // Torso (distinct silhouette per archetype)
  const shoulderW = isOni ? 14.5 : isSamurai ? 12.5 : isNinja ? 10 : 11;
  const waistW = isOni ? 11 : isSamurai ? 10 : 8.5;
  ctx.fillStyle = fillCol;
  ctx.beginPath();
  ctx.moveTo(-shoulderW, -42);
  ctx.lineTo(shoulderW, -42);
  ctx.lineTo(waistW, -12);
  ctx.lineTo(-waistW, -12);
  ctx.closePath();
  ctx.fill();

  // Samurai / Oni Chest Armor & Pauldrons
  if (isSamurai || isOni) {
    ctx.fillStyle = flash ? '#ffffff' : isOni ? '#450a0a' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-shoulderW + 1, -40);
    ctx.lineTo(shoulderW - 1, -40);
    ctx.lineTo(waistW - 1, -21);
    ctx.lineTo(-waistW + 1, -21);
    ctx.closePath();
    ctx.fill();

    // Armor plate ribs
    ctx.strokeStyle = flash ? '#ffffff' : isOni ? '#f59e0b' : '#64748b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-shoulderW + 3, -33);
    ctx.lineTo(shoulderW - 3, -33);
    ctx.moveTo(-shoulderW + 4, -27);
    ctx.lineTo(shoulderW - 4, -27);
    ctx.stroke();

    // Shoulder plates (sode)
    ctx.fillStyle = trimCol;
    ctx.beginPath();
    ctx.moveTo(-shoulderW - 4, -43);
    ctx.lineTo(-shoulderW + 4, -43);
    ctx.lineTo(-shoulderW + 2, -33);
    ctx.lineTo(-shoulderW - 5, -35);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(shoulderW - 4, -43);
    ctx.lineTo(shoulderW + 4, -43);
    ctx.lineTo(shoulderW + 5, -35);
    ctx.lineTo(shoulderW - 2, -33);
    ctx.closePath();
    ctx.fill();
  } else {
    // Gi V-neck lapel trim
    ctx.strokeStyle = flash ? '#ffffff' : 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -41);
    ctx.lineTo(1, -27);
    ctx.lineTo(6, -41);
    ctx.stroke();
  }

  // Waist belt + fluttering knot tails
  ctx.fillStyle = darkCol;
  ctx.fillRect(-waistW - 0.5, -20, (waistW + 0.5) * 2, 4.5);
  ctx.strokeStyle = darkCol;
  ctx.lineWidth = 3;
  const flutter = Math.sin(phase * 10) * 2.5;
  ctx.beginPath();
  ctx.moveTo(2, -17);
  ctx.lineTo(7, -8 + flutter * 0.4);
  ctx.moveTo(0, -17);
  ctx.lineTo(-4, -7 - flutter * 0.4);
  ctx.stroke();

  // Head
  const headR = isOni ? 12.5 : 11.2;
  const headY = isOni ? -55 : -54;
  ctx.fillStyle = fillCol;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Archetype Headgear / Face details
  if (isNinja) {
    // Ninja hood & crimson face mask
    ctx.fillStyle = flash ? '#ffffff' : '#0f172a';
    ctx.beginPath();
    ctx.arc(0, headY, headR + 0.6, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    // Face mask lower wrap
    ctx.fillStyle = trimCol;
    ctx.beginPath();
    ctx.arc(0, headY + 1, headR, 0.05, Math.PI - 0.05);
    ctx.fill();
    // Narrow glowing assassin eye
    ctx.fillStyle = flash ? '#ffffff' : '#fde047';
    ctx.beginPath();
    ctx.moveTo(3, headY - 2);
    ctx.lineTo(10, headY - 3.5);
    ctx.lineTo(8, headY);
    ctx.closePath();
    ctx.fill();
  } else if (isSamurai) {
    // Kabuto helmet dome + neck guard (shikoro)
    ctx.fillStyle = flash ? '#ffffff' : '#1e293b';
    ctx.beginPath();
    ctx.arc(0, headY - 1, headR + 2, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-headR - 2, headY - 1);
    ctx.lineTo(-headR - 5, headY + 8);
    ctx.lineTo(-4, headY + 6);
    ctx.closePath();
    ctx.fill();
    // Gold Kuwagata V-crest on front of kabuto
    ctx.strokeStyle = flash ? '#ffffff' : '#facc15';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(6, headY - 9);
    ctx.lineTo(13, headY - 21);
    ctx.moveTo(4, headY - 9);
    ctx.lineTo(-2, headY - 20);
    ctx.stroke();
    // Stern eyes
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(3, headY - 2, 6, 2.5);
  } else if (isOni) {
    // Oni Demon Mask + glowing eyes + twin horns + wild mane
    ctx.fillStyle = flash ? '#ffffff' : '#7f1d1d';
    ctx.beginPath();
    ctx.arc(0, headY + 2, headR - 1, -0.2, Math.PI + 0.2);
    ctx.fill();
    // Twin curved Oni horns
    ctx.fillStyle = flash ? '#ffffff' : '#fef08a';
    ctx.beginPath();
    ctx.moveTo(4, headY - 9);
    ctx.quadraticCurveTo(10, headY - 22, 16, headY - 25);
    ctx.quadraticCurveTo(9, headY - 15, 8, headY - 7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, headY - 10);
    ctx.quadraticCurveTo(1, headY - 23, 6, headY - 27);
    ctx.quadraticCurveTo(3, headY - 17, 2, headY - 8);
    ctx.closePath();
    ctx.fill();
    // Glowing demon eye
    ctx.fillStyle = flash ? '#ffffff' : '#fde047';
    ctx.beginPath();
    ctx.moveTo(3, headY - 2);
    ctx.lineTo(10.5, headY - 4.5);
    ctx.lineTo(9, headY + 0.5);
    ctx.closePath();
    ctx.fill();
    // Fangs
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(5, headY + 7);
    ctx.lineTo(7, headY + 3);
    ctx.lineTo(9, headY + 7);
    ctx.closePath();
    ctx.fill();
  } else {
    // Player intense brow / KO eyes
    ctx.fillStyle = '#0f172a';
    if (pose === 'ko') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(3, headY - 4);
      ctx.lineTo(8, headY + 1);
      ctx.moveTo(8, headY - 4);
      ctx.lineTo(3, headY + 1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(3, headY - 1);
      ctx.lineTo(9.5, headY - 2.8);
      ctx.lineTo(8.2, headY + 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Headband + flowing tails (player & ninja)
  if ((headbandColor && !isSamurai && !isOni) || isNinja) {
    ctx.fillStyle = trimCol;
    ctx.fillRect(-headR, headY - 6, headR * 2, 4.8);
    const tailWave = Math.sin(phase * 11) * 3.2;
    ctx.beginPath();
    ctx.moveTo(-headR + 1, headY - 4);
    ctx.lineTo(-headR - 15, headY - 9 + tailWave);
    ctx.lineTo(-headR - 11, headY - 1 + tailWave * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  // Front arm (guard, punch, or enemy weapon grip)
  ctx.strokeStyle = fillCol;
  ctx.lineWidth = isOni ? 8 : 6.4;
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(5, -36);
    ctx.lineTo(23, -47);
  } else if (pose === 'punch') {
    ctx.moveTo(5, -36);
    ctx.lineTo(36, -37);
  } else if (pose === 'kick') {
    ctx.moveTo(5, -35);
    ctx.lineTo(16, -42);
    ctx.lineTo(22, -35);
  } else if (pose === 'hurt') {
    ctx.moveTo(5, -36);
    ctx.lineTo(14, -44);
  } else {
    const guardShift = pose === 'walk' ? Math.cos(phase * walkSpeed) * 3 : 0;
    ctx.moveTo(4, -35);
    ctx.lineTo(15 + guardShift, -27);
    ctx.lineTo(19 + guardShift, -36);
  }
  ctx.stroke();

  // Enemy Archetype Weapons (when alive)
  if (pose !== 'ko') {
    const guardShift = pose === 'walk' ? Math.cos(phase * walkSpeed) * 3 : 0;
    if (isNinja) {
      // Twin kunai / tanto blade
      ctx.strokeStyle = flash ? '#ffffff' : '#cbd5e1';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(19 + guardShift, -36);
      ctx.lineTo(31 + guardShift, -41);
      ctx.stroke();
    } else if (isSamurai) {
      // Steel katana
      ctx.strokeStyle = flash ? '#ffffff' : '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(18 + guardShift, -35);
      ctx.lineTo(42 + guardShift, -54);
      ctx.stroke();
      ctx.fillStyle = flash ? '#ffffff' : '#facc15';
      ctx.fillRect(17 + guardShift, -38, 4, 6);
    } else if (isOni) {
      // Massive studded Kanabo war club
      ctx.strokeStyle = flash ? '#ffffff' : '#78350f';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(17 + guardShift, -34);
      ctx.lineTo(38 + guardShift, -62);
      ctx.stroke();
      ctx.strokeStyle = flash ? '#ffffff' : '#94a3b8';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(27 + guardShift, -47);
      ctx.lineTo(39 + guardShift, -63);
      ctx.stroke();
    }
  }

  // Fist / Glove highlight on punch
  if (pose === 'punch') {
    ctx.fillStyle = trimCol || '#fde047';
    ctx.beginPath();
    ctx.arc(37, -37, 4.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Player Katana / Golden Bo weapon boost
  if (hasWeapon) {
    const isAttacking = pose === 'punch' || pose === 'kick';
    const tipX = isAttacking ? 56 : 48;
    const tipY = isAttacking ? -38 : -54;
    // Outer luminous edge glow
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, -31);
    ctx.quadraticCurveTo(32, isAttacking ? -39 : -44, tipX, tipY);
    ctx.stroke();
    // Blade core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(14, -31);
    ctx.quadraticCurveTo(32, isAttacking ? -39 : -44, tipX, tipY);
    ctx.stroke();
    // Tsuba handguard
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(14, -31, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
