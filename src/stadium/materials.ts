import * as THREE from 'three';
import type { StadiumTextureSet } from './textures';

export interface StadiumMaterialSet {
  steelLouver: THREE.MeshPhysicalMaterial;
  roofCanopySteel: THREE.MeshPhysicalMaterial;
  retractableMembrane: THREE.MeshPhysicalMaterial;
  structuralTruss: THREE.MeshStandardMaterial;
  concretePodium: THREE.MeshStandardMaterial;
  facadeBacking: THREE.MeshStandardMaterial;
  skywalkGlass: THREE.MeshPhysicalMaterial;
  seatingBowl: THREE.MeshStandardMaterial;
  tierFascia: THREE.MeshStandardMaterial;
  pitchTurf: THREE.MeshStandardMaterial;
  plazaGranite: THREE.MeshStandardMaterial;
  cityContext: THREE.MeshStandardMaterial;
  treeFoliage: THREE.MeshStandardMaterial;
  treeTrunk: THREE.MeshStandardMaterial;
  haloScreen: THREE.MeshStandardMaterial;
  floodlightEmitter: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  goalWhite: THREE.MeshStandardMaterial;
  futuristicExoFin: THREE.MeshPhysicalMaterial;
  futuristicIrisGlass: THREE.MeshPhysicalMaterial;
  futuristicLightTrim: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createStadiumMaterials(
  textures: StadiumTextureSet,
  isSoftwareGl: boolean,
): StadiumMaterialSet {
  const steelLouver = new THREE.MeshPhysicalMaterial({
    color: 0xe6ebf2,
    map: textures.steelColor,
    roughnessMap: textures.steelRoughness,
    bumpMap: textures.steelBump,
    bumpScale: 0.18,
    metalness: 0.92,
    roughness: 0.22,
    anisotropy: 0.85,
    anisotropyRotation: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3,
    side: THREE.DoubleSide,
  });

  const roofCanopySteel = new THREE.MeshPhysicalMaterial({
    color: 0xdce2ea,
    map: textures.steelColor,
    roughnessMap: textures.steelRoughness,
    metalness: 0.86,
    roughness: 0.34,
    anisotropy: 0.55,
    side: THREE.DoubleSide,
  });

  const retractableMembrane = new THREE.MeshPhysicalMaterial({
    color: 0xe4e9f0,
    roughness: 0.42,
    metalness: 0.2,
    clearcoat: 0.25,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide,
  });

  const structuralTruss = new THREE.MeshStandardMaterial({
    color: 0x1b222d,
    metalness: 0.78,
    roughness: 0.38,
  });

  const concretePodium = new THREE.MeshStandardMaterial({
    color: 0x262b34,
    metalness: 0.08,
    roughness: 0.86,
  });

  const facadeBacking = new THREE.MeshStandardMaterial({
    color: 0x11151d,
    emissive: new THREE.Color(0xffb86c),
    emissiveIntensity: 0.08,
    metalness: 0.25,
    roughness: 0.78,
    side: THREE.DoubleSide,
  });

  const skywalkGlass = new THREE.MeshPhysicalMaterial({
    color: 0x8db6db,
    emissive: new THREE.Color(0xffcf8b),
    emissiveIntensity: 0.24,
    metalness: 0.1,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.65,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.85,
    ior: 1.52,
    clearcoat: 1.0,
    side: THREE.DoubleSide,
  });

  const seatingBowl = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.seatingColor,
    metalness: 0.06,
    roughness: 0.76,
    side: THREE.DoubleSide,
  });

  const tierFascia = new THREE.MeshStandardMaterial({
    color: 0xdde3eb,
    metalness: 0.22,
    roughness: 0.45,
  });

  const pitchTurf = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.pitchColor,
    metalness: 0.0,
    roughness: 0.88,
  });

  const plazaGranite = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.plazaColor,
    bumpMap: textures.plazaBump,
    bumpScale: 0.08,
    metalness: 0.05,
    roughness: 0.82,
  });

  const cityContext = new THREE.MeshStandardMaterial({
    color: 0x262c36,
    metalness: 0.08,
    roughness: 0.86,
  });

  const treeFoliage = new THREE.MeshStandardMaterial({
    color: 0x3b633c,
    metalness: 0.0,
    roughness: 0.86,
  });

  const treeTrunk = new THREE.MeshStandardMaterial({
    color: 0x4b3b2d,
    metalness: 0.0,
    roughness: 0.92,
  });

  const haloScreen = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.haloColor,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: textures.haloColor,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const floodlightEmitter = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xeef6ff),
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
  });

  const contactShadow = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });

  const goalWhite = new THREE.MeshStandardMaterial({
    color: 0xf4f6f9,
    metalness: 0.4,
    roughness: 0.32,
  });

  const futuristicExoFin = new THREE.MeshPhysicalMaterial({
    color: 0xf0f4fa,
    metalness: 0.94,
    roughness: 0.16,
    anisotropy: 0.75,
    clearcoat: 0.4,
    clearcoatRoughness: 0.18,
  });

  const futuristicIrisGlass = new THREE.MeshPhysicalMaterial({
    color: 0xbfd8f2,
    emissive: new THREE.Color(0x1b3b66),
    emissiveIntensity: 0.25,
    metalness: 0.18,
    roughness: 0.12,
    transmission: isSoftwareGl ? 0 : 0.7,
    transparent: true,
    opacity: isSoftwareGl ? 0.62 : 0.88,
    ior: 1.5,
    clearcoat: 1.0,
    side: THREE.DoubleSide,
  });

  const futuristicLightTrim = new THREE.MeshStandardMaterial({
    color: 0xe6f2ff,
    emissive: new THREE.Color(0x9bd0ff),
    emissiveIntensity: 1.35,
    roughness: 0.2,
    metalness: 0.2,
  });

  const allMaterials = [
    steelLouver,
    roofCanopySteel,
    retractableMembrane,
    structuralTruss,
    concretePodium,
    facadeBacking,
    skywalkGlass,
    seatingBowl,
    tierFascia,
    pitchTurf,
    plazaGranite,
    cityContext,
    treeFoliage,
    treeTrunk,
    haloScreen,
    floodlightEmitter,
    contactShadow,
    goalWhite,
    futuristicExoFin,
    futuristicIrisGlass,
    futuristicLightTrim,
  ];

  return {
    steelLouver,
    roofCanopySteel,
    retractableMembrane,
    structuralTruss,
    concretePodium,
    facadeBacking,
    skywalkGlass,
    seatingBowl,
    tierFascia,
    pitchTurf,
    plazaGranite,
    cityContext,
    treeFoliage,
    treeTrunk,
    haloScreen,
    floodlightEmitter,
    contactShadow,
    goalWhite,
    futuristicExoFin,
    futuristicIrisGlass,
    futuristicLightTrim,
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
