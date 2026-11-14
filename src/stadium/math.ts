import { STADIUM_DIMS } from './constants';

export interface Point2D {
  x: number;
  z: number;
}

/**
 * Evaluates a superellipse (rounded rectangle) perimeter point at angle theta (radians).
 * p controls corner squaring: p=2 is ellipse, p=3.8..4.5 yields the stadium footprint.
 */
export function superellipsePoint(
  theta: number,
  halfX: number,
  halfZ: number,
  exponent = 3.6,
): Point2D {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const exp = 2 / exponent;
  const x = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp) * halfX;
  const z = Math.sign(sinT) * Math.pow(Math.abs(sinT), exp) * halfZ;
  return { x, z };
}

/**
 * Evaluates the asymmetric outer envelope of the renovated Santiago Bernabéu.
 * Features the signature Paseo de la Castellana sweep along -X (cos(theta) < 0),
 * undulating vertically with heightRatio in [0, 1].
 */
export function bernabeuEnvelopePoint(
  theta: number,
  heightRatio: number,
): Point2D {
  const h = Math.max(0, Math.min(1, heightRatio));
  const base = superellipsePoint(
    theta,
    STADIUM_DIMS.facadeHalfX,
    STADIUM_DIMS.facadeHalfZ,
    3.5,
  );

  // West facade (-X, Paseo de la Castellana) projects forward with a fluid sculptural belly
  // peaking around mid-height (h ~ 0.48) and tapering cleanly into the crown & plaza podium.
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const westWeight = cosT < 0 ? Math.pow(-cosT, 1.45) : 0;

  // Sculptural vertical wave along Castellana + gentle inward taper at top crown
  const castellanaProfile = Math.sin(Math.PI * Math.pow(h, 0.85));
  const waveModulation =
    1 + 0.14 * Math.cos(sinT * Math.PI * 1.15) - 0.08 * Math.pow(h - 0.5, 2);

  const westExpansion =
    westWeight * STADIUM_DIMS.castellanaBulge * castellanaProfile * waveModulation;

  // Overall aerodynamic crown tuck near roof edge
  const crownTaper = 1 - 0.055 * Math.pow(h, 2.2) + 0.03 * Math.sin(Math.PI * h);

  // Subtle corner curvature modulation on East / North / South facades
  const eastWeight = cosT > 0 ? Math.pow(cosT, 1.5) : 0;
  const eastContour = eastWeight * 5.5 * Math.sin(Math.PI * h);

  return {
    x: base.x * crownTaper - westExpansion + eastContour,
    z: base.z * crownTaper * (1 + 0.025 * Math.sin(Math.PI * h)),
  };
}

/**
 * Computes roof crown elevation at normalized coordinates (nx, nz) in [-1, 1],
 * capturing the arched central spine and sculpted perimeter lip of the Bernabéu roof.
 */
export function roofElevationAt(nx: number, nz: number): number {
  const clampedX = Math.max(-1, Math.min(1, nx));
  const clampedZ = Math.max(-1, Math.min(1, nz));
  const archX = 1 - Math.pow(clampedX, 2) * 0.65;
  const archZ = 1 - Math.pow(clampedZ, 2) * 0.45;
  const lift = 6.2 * archX * archZ;
  return STADIUM_DIMS.facadeHeight + lift;
}

/**
 * Computes frame-rate independent exponential damping toward a target value.
 */
export function dampValue(
  current: number,
  target: number,
  lambda: number,
  deltaSeconds: number,
): number {
  const dt = Math.max(0, Math.min(0.1, deltaSeconds));
  const alpha = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * alpha;
}

/**
 * Computes the Z offset of each classic retractable roof leaf based on openFactor in [0, 1].
 * 0 = closed over the pitch center; 1 = retracted toward North (-Z) and South (+Z) tracks.
 */
export function computeRoofLeafOffsets(openFactor: number): {
  northZ: number;
  southZ: number;
} {
  const clamped = Math.max(0, Math.min(1, openFactor));
  const slideDistance = STADIUM_DIMS.oculusHalfZ * 0.96;
  const offset = clamped * slideDistance;
  return {
    northZ: offset === 0 ? 0 : -offset,
    southZ: offset,
  };
}

/**
 * Computes radial retraction transform for one of N futuristic kinetic iris roof petals.
 * When openFactor = 0, petals meet near the oculus center; when 1, they pivot & retract outward.
 */
export function computeIrisPetalTransform(
  petalIndex: number,
  totalPetals: number,
  openFactor: number,
): { offsetX: number; offsetZ: number; yawTilt: number; scaleRadial: number } {
  const safeTotal = Math.max(1, totalPetals);
  const clamped = Math.max(0, Math.min(1, openFactor));
  const angle = (petalIndex / safeTotal) * Math.PI * 2;
  const radialSlide = clamped * 28;
  return {
    offsetX: Math.cos(angle) * radialSlide,
    offsetZ: Math.sin(angle) * radialSlide,
    yawTilt: clamped * 0.24,
    scaleRadial: 1 - clamped * 0.42,
  };
}
