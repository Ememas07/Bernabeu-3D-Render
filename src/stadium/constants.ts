export type CameraPresetId =
  | 'aerial'
  | 'pitch'
  | 'spectator'
  | 'castellana'
  | 'skywalk';

export type AtmosphereMode = 'golden' | 'night' | 'daylight';
export type ConceptMode = 'classic' | 'futuristic';

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  highlight: string;
}

export interface StadiumDimensions {
  pitchLength: number; // Z-axis (North-South), meters
  pitchWidth: number; // X-axis (West Castellana - East Padre Damian), meters
  fieldApronLength: number;
  fieldApronWidth: number;
  bowlHalfX: number;
  bowlHalfZ: number;
  facadeHalfX: number;
  facadeHalfZ: number;
  facadeHeight: number;
  roofCrownHeight: number;
  oculusHalfX: number;
  oculusHalfZ: number;
  castellanaBulge: number;
}

// 1 scene unit = 1 meter.
// Stadium oriented with pitch length along Z-axis (North -Z, South +Z)
// West (Paseo de la Castellana) = -X, East (Padre Damián) = +X.
export const STADIUM_DIMS: StadiumDimensions = {
  pitchLength: 105,
  pitchWidth: 68,
  fieldApronLength: 122,
  fieldApronWidth: 84,
  bowlHalfX: 82,
  bowlHalfZ: 104,
  facadeHalfX: 98,
  facadeHalfZ: 124,
  facadeHeight: 54,
  roofCrownHeight: 60,
  oculusHalfX: 40,
  oculusHalfZ: 58,
  castellanaBulge: 22,
};

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPreset> = {
  aerial: {
    id: 'aerial',
    label: 'Aerial',
    position: [-208, 128, 184],
    target: [-6, 16, 0],
    fov: 38,
    highlight: 'High-angle aerial of sweeping metallic envelope & roof oculus',
  },
  pitch: {
    id: 'pitch',
    label: 'Pitch Level',
    position: [0, 2.2, 39],
    target: [0, 14, -48],
    fov: 60,
    highlight: 'Ground-level pitch view framing 4-tier steep bowl & 360° halo',
  },
  spectator: {
    id: 'spectator',
    label: 'Stands Seat',
    position: [-59, 29.2, 83],
    target: [8, 4, -12],
    fov: 52,
    highlight: 'Spectator vantage from Anfiteatro stands overlooking full bowl',
  },
  castellana: {
    id: 'castellana',
    label: 'Castellana',
    position: [-258, 32, 138],
    target: [-16, 22, 0],
    fov: 38,
    highlight: 'Street-level Paseo de la Castellana sculptural louver facade',
  },
  skywalk: {
    id: 'skywalk',
    label: 'Skywalk',
    position: [-46, 46, 70],
    target: [6, 8, -12],
    fov: 48,
    highlight: 'Panoramic upper crown gallery & structural mega-trusses',
  },
};

export const ATMOSPHERE_CONFIG: Record<
  AtmosphereMode,
  {
    label: string;
    skyColor: number;
    fogColor: number;
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    sunPosition: [number, number, number];
    hemiSky: number;
    hemiGround: number;
    hemiIntensity: number;
    rimColor: number;
    rimIntensity: number;
    exposure: number;
    interiorGlow: number;
    floodlightIntensity: number;
    skyTurbidity: number;
    skyRayleigh: number;
    skyElevation: number;
    skyAzimuth: number;
  }
> = {
  golden: {
    label: 'Golden Hour',
    skyColor: 0x242c3d,
    fogColor: 0x3b3538,
    fogDensity: 0.00085,
    sunColor: 0xffb974,
    sunIntensity: 3.4,
    sunPosition: [-190, 48, 135],
    hemiSky: 0x6f94c9,
    hemiGround: 0x362a22,
    hemiIntensity: 0.95,
    rimColor: 0x7aa8ff,
    rimIntensity: 0.95,
    exposure: 1.04,
    interiorGlow: 1.0,
    floodlightIntensity: 1.5,
    skyTurbidity: 8.5,
    skyRayleigh: 3.4,
    skyElevation: 3.8,
    skyAzimuth: -128,
  },
  night: {
    label: 'Match Night',
    skyColor: 0x070b14,
    fogColor: 0x090e1a,
    fogDensity: 0.001,
    sunColor: 0x7ba7f0,
    sunIntensity: 0.72,
    sunPosition: [140, 150, -110],
    hemiSky: 0x1e3257,
    hemiGround: 0x0e121a,
    hemiIntensity: 0.68,
    rimColor: 0x9ec5ff,
    rimIntensity: 0.65,
    exposure: 1.12,
    interiorGlow: 1.9,
    floodlightIntensity: 3.6,
    skyTurbidity: 2.0,
    skyRayleigh: 0.4,
    skyElevation: -3,
    skyAzimuth: -140,
  },
  daylight: {
    label: 'Madrid Sun',
    skyColor: 0x8bb5e3,
    fogColor: 0xb7d1ea,
    fogDensity: 0.00068,
    sunColor: 0xfff5e4,
    sunIntensity: 3.1,
    sunPosition: [-140, 195, 130],
    hemiSky: 0xcbe4ff,
    hemiGround: 0x524e47,
    hemiIntensity: 1.15,
    rimColor: 0xd0e4ff,
    rimIntensity: 0.55,
    exposure: 0.96,
    interiorGlow: 0.12,
    floodlightIntensity: 0.35,
    skyTurbidity: 2.8,
    skyRayleigh: 1.1,
    skyElevation: 38,
    skyAzimuth: -135,
  },
};
