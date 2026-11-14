import * as THREE from 'three';

export interface StadiumTextureSet {
  pitchColor: THREE.CanvasTexture;
  steelColor: THREE.CanvasTexture;
  steelRoughness: THREE.CanvasTexture;
  steelBump: THREE.CanvasTexture;
  plazaColor: THREE.CanvasTexture;
  plazaBump: THREE.CanvasTexture;
  seatingColor: THREE.CanvasTexture;
  haloColor: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

export function createStadiumTextures(maxAnisotropy: number): StadiumTextureSet {
  const anisotropy = Math.max(1, Math.min(8, maxAnisotropy));

  const pitchColor = buildPitchTexture(anisotropy);
  const { color: steelColor, roughness: steelRoughness, bump: steelBump } =
    buildSteelLouverTextures(anisotropy);
  const { color: plazaColor, bump: plazaBump } = buildPlazaTextures(anisotropy);
  const seatingColor = buildSeatingTexture(anisotropy);
  const haloColor = buildHaloScoreboardTexture(anisotropy);
  const contactShadow = buildContactShadowTexture();

  return {
    pitchColor,
    steelColor,
    steelRoughness,
    steelBump,
    plazaColor,
    plazaBump,
    seatingColor,
    haloColor,
    contactShadow,
    dispose: () => {
      pitchColor.dispose();
      steelColor.dispose();
      steelRoughness.dispose();
      steelBump.dispose();
      plazaColor.dispose();
      plazaBump.dispose();
      seatingColor.dispose();
      haloColor.dispose();
      contactShadow.dispose();
    },
  };
}

function buildPitchTexture(anisotropy: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 1536;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Turf apron base
  ctx.fillStyle = '#1f5e2c';
  ctx.fillRect(0, 0, w, h);

  // Regulation pitch area inside apron (105x68 inside 122x84)
  const padX = ((84 - 68) / 2 / 84) * w;
  const padY = ((122 - 105) / 2 / 122) * h;
  const pw = w - padX * 2;
  const ph = h - padY * 2;

  // Alternating mowed stripes (18 bands along length)
  const bands = 18;
  const bandH = ph / bands;
  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2b7a38' : '#246c31';
    ctx.fillRect(padX, padY + i * bandH, pw, bandH + 1);
  }

  // Subtle cross-cut turf grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
  for (let x = 0; x < w; x += 16) {
    if ((x / 16) % 2 === 0) ctx.fillRect(x, 0, 8, h);
  }

  // Crisp white FIFA pitch markings
  ctx.strokeStyle = 'rgba(244, 248, 244, 0.94)';
  ctx.fillStyle = 'rgba(244, 248, 244, 0.94)';
  ctx.lineWidth = 4;

  // Outer touchlines & goal lines
  ctx.strokeRect(padX, padY, pw, ph);

  // Halfway line
  const midY = padY + ph / 2;
  const midX = padX + pw / 2;
  ctx.beginPath();
  ctx.moveTo(padX, midY);
  ctx.lineTo(padX + pw, midY);
  ctx.stroke();

  // Center circle (radius 9.15m)
  const pxPerMeterX = pw / 68;
  const pxPerMeterY = ph / 105;
  const rCenter = 9.15 * pxPerMeterX;
  ctx.beginPath();
  ctx.arc(midX, midY, rCenter, 0, Math.PI * 2);
  ctx.stroke();

  // Center spot
  ctx.beginPath();
  ctx.arc(midX, midY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas (40.32m wide x 16.5m deep) & 6-yard boxes (18.32m x 5.5m)
  const penW = 40.32 * pxPerMeterX;
  const penH = 16.5 * pxPerMeterY;
  const goalBoxW = 18.32 * pxPerMeterX;
  const goalBoxH = 5.5 * pxPerMeterY;
  const penSpotDist = 11 * pxPerMeterY;

  // Top (North) penalty area
  ctx.strokeRect(midX - penW / 2, padY, penW, penH);
  ctx.strokeRect(midX - goalBoxW / 2, padY, goalBoxW, goalBoxH);
  ctx.beginPath();
  ctx.arc(midX, padY + penSpotDist, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(midX, padY + penSpotDist, rCenter, 0.21 * Math.PI, 0.79 * Math.PI);
  ctx.stroke();

  // Bottom (South) penalty area
  ctx.strokeRect(midX - penW / 2, padY + ph - penH, penW, penH);
  ctx.strokeRect(midX - goalBoxW / 2, padY + ph - goalBoxH, goalBoxW, goalBoxH);
  ctx.beginPath();
  ctx.arc(midX, padY + ph - penSpotDist, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(midX, padY + ph - penSpotDist, rCenter, 1.21 * Math.PI, 1.79 * Math.PI);
  ctx.stroke();

  // Corner arcs
  const cornerR = 1.4 * pxPerMeterX;
  const corners: Array<[number, number, number, number]> = [
    [padX, padY, 0, Math.PI / 2],
    [padX + pw, padY, Math.PI / 2, Math.PI],
    [padX + pw, padY + ph, Math.PI, Math.PI * 1.5],
    [padX, padY + ph, Math.PI * 1.5, Math.PI * 2],
  ];
  for (const [cx, cy, s, e] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerR, s, e);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function buildSteelLouverTextures(anisotropy: number) {
  const size = 512;

  // Color map: warm brushed titanium-steel with fine horizontal micro-grain
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;
  cCtx.fillStyle = '#cdd3db';
  cCtx.fillRect(0, 0, size, size);

  // Horizontal brushed streaks
  for (let y = 0; y < size; y += 2) {
    const lum = 198 + Math.round(Math.sin(y * 0.41) * 10 + (y % 4 === 0 ? 6 : -4));
    cCtx.fillStyle = `rgb(${lum}, ${lum + 3}, ${lum + 8})`;
    cCtx.fillRect(0, y, size, 2);
  }
  // Vertical panel seam lines (every 128px)
  cCtx.fillStyle = 'rgba(70, 78, 92, 0.32)';
  for (let x = 0; x < size; x += 128) {
    cCtx.fillRect(x, 0, 2, size);
  }

  const color = new THREE.CanvasTexture(cCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(16, 2);
  color.anisotropy = anisotropy;

  // Roughness / bump data map (linear space)
  const bCanvas = document.createElement('canvas');
  bCanvas.width = size;
  bCanvas.height = size;
  const bCtx = bCanvas.getContext('2d')!;
  bCtx.fillStyle = '#707070';
  bCtx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 2) {
    const v = 90 + Math.round(Math.cos(y * 0.6) * 24);
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(0, y, size, 1);
  }
  // Micro-perforation dot grid typical of the Bernabeu stainless louvers
  bCtx.fillStyle = '#282828';
  for (let y = 8; y < size; y += 16) {
    for (let x = 8; x < size; x += 16) {
      bCtx.fillRect(x, y, 3, 3);
    }
  }

  const bump = new THREE.CanvasTexture(bCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(16, 2);
  bump.anisotropy = anisotropy;

  const roughness = new THREE.CanvasTexture(bCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(16, 2);
  roughness.anisotropy = anisotropy;

  return { color, roughness, bump };
}

function buildPlazaTextures(anisotropy: number) {
  const size = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const ctx = cCanvas.getContext('2d')!;

  ctx.fillStyle = '#474c56';
  ctx.fillRect(0, 0, size, size);

  const tiles = 8;
  const step = size / tiles;
  for (let row = 0; row < tiles; row++) {
    for (let col = 0; col < tiles; col++) {
      const shade = 68 + ((row * 7 + col * 13) % 14);
      ctx.fillStyle = `rgb(${shade}, ${shade + 3}, ${shade + 9})`;
      ctx.fillRect(col * step + 1, row * step + 1, step - 2, step - 2);
    }
  }

  const color = new THREE.CanvasTexture(cCanvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.wrapS = THREE.RepeatWrapping;
  color.wrapT = THREE.RepeatWrapping;
  color.repeat.set(28, 28);
  color.anisotropy = anisotropy;

  const bump = new THREE.CanvasTexture(cCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(28, 28);
  bump.anisotropy = anisotropy;

  return { color, bump };
}

function buildSeatingTexture(anisotropy: number): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep Madrid navy base
  ctx.fillStyle = '#122b52';
  ctx.fillRect(0, 0, w, h);

  // Horizontal stepped seating rows
  const rows = 32;
  const rowH = h / rows;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = r % 2 === 0 ? '#183a6e' : '#0f2342';
    ctx.fillRect(0, r * rowH, w, rowH * 0.72);
    ctx.fillStyle = '#091529';
    ctx.fillRect(0, r * rowH + rowH * 0.72, w, rowH * 0.28);
  }

  // Radial concrete stair aisles
  ctx.fillStyle = 'rgba(190, 198, 210, 0.35)';
  for (let x = 0; x < w; x += 64) {
    ctx.fillRect(x, 0, 5, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 1);
  tex.anisotropy = anisotropy;
  return tex;
}

function buildHaloScoreboardTexture(anisotropy: number): THREE.CanvasTexture {
  const w = 2048;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Deep royal navy backdrop with subtle gold border bands
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, '#0b1836');
  grad.addColorStop(0.5, '#132a5c');
  grad.addColorStop(1, '#0b1836');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Gold architectural rim lines
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, 6, w, 4);
  ctx.fillRect(0, h - 10, w, 4);

  // Repeating crisp stadium halo typography
  ctx.fillStyle = '#f8fafc';
  ctx.font = '600 42px "Outfit", sans-serif';
  ctx.textBaseline = 'middle';
  const labels = [
    'ESTADIO SANTIAGO BERNABÉU',
    'MADRID',
    'REAL MADRID C.F.',
    'PASEO DE LA CASTELLANA',
  ];
  const step = w / labels.length;
  labels.forEach((label, idx) => {
    ctx.fillText(label, idx * step + 36, h / 2 + 2);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

function buildContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.14,
    size / 2,
    size / 2,
    size * 0.5,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
