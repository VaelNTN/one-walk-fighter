export type FighterPose = 'idle' | 'walk' | 'punch' | 'kick' | 'ko' | 'hurt';

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
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);

  const bob =
    pose === 'walk'
      ? Math.abs(Math.sin(phase * 12)) * -3.5
      : pose === 'idle'
      ? Math.sin(phase * 4) * 1.5
      : 0;
  ctx.translate(0, bob);

  if (auraColor && (pose === 'punch' || pose === 'kick' || hasWeapon)) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = auraColor;
    ctx.beginPath();
    ctx.ellipse(0, -32, 26, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Ground shadow (skip when airborne KO)
  if (pose !== 'ko') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 17 - bob, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stride = pose === 'walk' ? Math.sin(phase * 12) * 10 : 0;

  // Back leg
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 7.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(-3, -12);
    ctx.lineTo(-16, 4);
    ctx.lineTo(-22, 16);
  } else if (pose === 'kick') {
    ctx.moveTo(-3, -13);
    ctx.lineTo(-10, 2);
    ctx.lineTo(-12, 16);
  } else if (pose === 'punch') {
    ctx.moveTo(-4, -13);
    ctx.lineTo(-13, 2);
    ctx.lineTo(-17, 16);
  } else {
    ctx.moveTo(-3, -13);
    ctx.lineTo(-8 - stride * 0.6, 2);
    ctx.lineTo(-10 - stride, 16);
  }
  ctx.stroke();

  // Front leg (or high kick!)
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(3, -12);
    ctx.lineTo(15, 2);
    ctx.lineTo(19, 17);
  } else if (pose === 'kick') {
    ctx.moveTo(3, -15);
    ctx.lineTo(22, -26);
    ctx.lineTo(38, -32);
  } else if (pose === 'punch') {
    ctx.moveTo(4, -13);
    ctx.lineTo(14, 1);
    ctx.lineTo(17, 16);
  } else {
    ctx.moveTo(3, -13);
    ctx.lineTo(8 + stride * 0.6, 2);
    ctx.lineTo(11 + stride, 16);
  }
  ctx.stroke();

  // Back arm
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(-5, -36);
    ctx.lineTo(-20, -48);
  } else if (pose === 'punch') {
    ctx.moveTo(-5, -35);
    ctx.lineTo(-14, -27);
    ctx.lineTo(-6, -23);
  } else if (pose === 'kick') {
    ctx.moveTo(-5, -35);
    ctx.lineTo(-17, -28);
  } else if (pose === 'hurt') {
    ctx.moveTo(-5, -36);
    ctx.lineTo(-16, -42);
  } else {
    ctx.moveTo(-4, -35);
    ctx.lineTo(-13, -25);
    ctx.lineTo(-8, -19);
  }
  ctx.stroke();

  // Gi Torso (tapered martial-arts tunic silhouette)
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(-11, -41);
  ctx.lineTo(11, -41);
  ctx.lineTo(9, -12);
  ctx.lineTo(-9, -12);
  ctx.closePath();
  ctx.fill();

  // V-neck lapel trim
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -41);
  ctx.lineTo(1, -27);
  ctx.lineTo(6, -41);
  ctx.stroke();

  // Gi waist belt + fluttering knot tails
  ctx.fillStyle = beltColor;
  ctx.fillRect(-9.5, -20, 19, 4.5);
  ctx.strokeStyle = beltColor;
  ctx.lineWidth = 3;
  const flutter = Math.sin(phase * 10) * 2.5;
  ctx.beginPath();
  ctx.moveTo(2, -17);
  ctx.lineTo(7, -8 + flutter * 0.4);
  ctx.moveTo(0, -17);
  ctx.lineTo(-4, -7 - flutter * 0.4);
  ctx.stroke();

  // Head
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(0, -54, 11.5, 0, Math.PI * 2);
  ctx.fill();

  // Intense brow/eye slit
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(3, -55);
  ctx.lineTo(9, -56.5);
  ctx.lineTo(8, -53);
  ctx.closePath();
  ctx.fill();

  // Headband + flowing tails
  if (headbandColor) {
    ctx.fillStyle = headbandColor;
    ctx.fillRect(-11.5, -60, 23, 5);
    const tailWave = Math.sin(phase * 11) * 3;
    ctx.beginPath();
    ctx.moveTo(-11, -58);
    ctx.lineTo(-26, -63 + tailWave);
    ctx.lineTo(-22, -55 + tailWave * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  // Front arm (guard, punch, or weapon)
  ctx.strokeStyle = bodyColor;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  if (pose === 'ko') {
    ctx.moveTo(5, -36);
    ctx.lineTo(22, -46);
  } else if (pose === 'punch') {
    ctx.moveTo(5, -36);
    ctx.lineTo(35, -37);
  } else if (pose === 'kick') {
    ctx.moveTo(5, -35);
    ctx.lineTo(16, -42);
    ctx.lineTo(22, -35);
  } else if (pose === 'hurt') {
    ctx.moveTo(5, -36);
    ctx.lineTo(14, -44);
  } else {
    const guardShift = pose === 'walk' ? Math.cos(phase * 12) * 3 : 0;
    ctx.moveTo(4, -35);
    ctx.lineTo(15 + guardShift, -27);
    ctx.lineTo(19 + guardShift, -36);
  }
  ctx.stroke();

  // Fist / Glove highlight on punch
  if (pose === 'punch') {
    ctx.fillStyle = headbandColor || '#fde047';
    ctx.beginPath();
    ctx.arc(36, -37, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bo staff / katana weapon boost
  if (hasWeapon) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, -28);
    ctx.lineTo(50, pose === 'punch' || pose === 'kick' ? -39 : -50);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(26, -33);
    ctx.lineTo(50, pose === 'punch' || pose === 'kick' ? -39 : -50);
    ctx.stroke();
  }

  ctx.restore();
}
