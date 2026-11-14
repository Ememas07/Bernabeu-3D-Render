import * as THREE from 'three';
import { STADIUM_DIMS, type ConceptMode } from './constants';
import {
  bernabeuEnvelopePoint,
  computeIrisPetalTransform,
  computeRoofLeafOffsets,
  roofElevationAt,
  superellipsePoint,
} from './math';
import type { StadiumMaterialSet } from './materials';

export interface BernabeuAssembly {
  root: THREE.Group;
  northRoofLeaf: THREE.Group;
  southRoofLeaf: THREE.Group;
  eastCutawayFacade: THREE.Group;
  roofCapGroup: THREE.Group;
  updateDynamicState: (
    roofOpenFactor: number,
    cutawayFactor: number,
    concept: ConceptMode,
  ) => void;
  dispose: () => void;
}

export function buildBernabeu(materials: StadiumMaterialSet): BernabeuAssembly {
  const root = new THREE.Group();
  root.name = 'EstadioSantiagoBernabeu';

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const extraMaterialsToDispose: THREE.Material[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometriesToDispose.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    extraMaterialsToDispose.push(m);
    return m;
  };

  // 1. Plaza, Castellana boulevard, trees & Madrid context
  const plazaGroup = buildPlazaAndContext(materials, trackGeo);
  root.add(plazaGroup);

  // 2. Pitch, goals, dugouts, 4-tier seating bowl & corner structural towers
  const { bowlGroup, cutawayCore } = buildPitchAndBowl(
    materials,
    trackGeo,
    trackMat,
  );
  root.add(bowlGroup);

  // 3. Signature asymmetric stainless-steel louver facade + Skywalk 360
  const { facadeGroup, frontCutawayFacade } = buildSweepingFacade(
    materials,
    trackGeo,
  );
  root.add(facadeGroup);

  // 4. Fixed roof canopy, trusses, 360-degree halo & classic retractable roof leaves
  const { roofCapGroup, northRoofLeaf, southRoofLeaf } = buildRoofAndHalo(
    materials,
    trackGeo,
  );
  root.add(roofCapGroup);

  // 5. Futuristic architectural concept elements (kinetic iris roof, 5th sky-tier, aero exo-fins)
  const {
    futuristicExteriorGroup,
    futuristicRoofGroup,
    irisPetals,
    irisTotal,
  } = buildFuturisticConcept(materials, trackGeo);
  root.add(futuristicExteriorGroup);
  roofCapGroup.add(futuristicRoofGroup);

  const updateDynamicState = (
    roofOpenFactor: number,
    cutawayFactor: number,
    concept: ConceptMode,
  ) => {
    const isFuturistic = concept === 'futuristic';

    // Toggle classic vs futuristic roof & exterior elements
    northRoofLeaf.visible = !isFuturistic;
    southRoofLeaf.visible = !isFuturistic;
    futuristicExteriorGroup.visible = isFuturistic;
    futuristicRoofGroup.visible = isFuturistic;

    // Classic two-leaf slide
    const { northZ, southZ } = computeRoofLeafOffsets(roofOpenFactor);
    northRoofLeaf.position.z = northZ;
    southRoofLeaf.position.z = southZ;
    const tuckY = -Math.pow(roofOpenFactor, 1.4) * 1.4;
    northRoofLeaf.position.y = tuckY;
    southRoofLeaf.position.y = tuckY;

    // Futuristic 12-petal kinetic iris retraction (elliptically scaled by irisPivotGroup)
    if (isFuturistic) {
      irisPetals.forEach((petal, idx) => {
        const t = computeIrisPetalTransform(idx, irisTotal, roofOpenFactor);
        const baseY = (idx % 2) * 0.28;
        petal.position.set(t.offsetX, baseY + t.yawTilt * 2.5, t.offsetZ);
        petal.rotation.y = -(idx / irisTotal) * Math.PI * 2 + t.yawTilt;
        petal.scale.set(t.scaleRadial, 1, 1);
      });
    }

    // Architectural cutaway cleanly lifts & hides the South-West camera-facing corner & roof
    const c = Math.max(0, Math.min(1, cutawayFactor));
    const liftY = c * 32;
    const showShell = c < 0.48;
    frontCutawayFacade.position.set(0, liftY, 0);
    frontCutawayFacade.visible = showShell;
    cutawayCore.position.set(0, liftY, 0);
    cutawayCore.visible = showShell;
    futuristicExteriorGroup.visible = isFuturistic && showShell;
    roofCapGroup.position.y = c * 28;
    roofCapGroup.visible = c < 0.55;
  };

  return {
    root,
    northRoofLeaf,
    southRoofLeaf,
    eastCutawayFacade: frontCutawayFacade,
    roofCapGroup,
    updateDynamicState,
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
      extraMaterialsToDispose.forEach((m) => m.dispose());
    },
  };
}

function buildPlazaAndContext(
  materials: StadiumMaterialSet,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MadridPlazaAndContext';

  // Ground granite esplanade extending to horizon fog
  const groundGeo = trackGeo(new THREE.PlaneGeometry(920, 920));
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, materials.plazaGranite);
  ground.position.y = 0;
  ground.receiveShadow = true;
  group.add(ground);

  // Contact shadow disc directly beneath the stadium footprint
  const contactGeo = trackGeo(new THREE.PlaneGeometry(290, 340));
  contactGeo.rotateX(-Math.PI / 2);
  const contact = new THREE.Mesh(contactGeo, materials.contactShadow);
  contact.position.set(-10, 0.025, 0);
  group.add(contact);

  // Stepped concrete stadium podium plinth (2 tiers)
  const podiumShapes = [
    { scale: 1.07, height: 0.7, y: 0.35 },
    { scale: 1.03, height: 1.0, y: 0.9 },
  ];
  for (const step of podiumShapes) {
    const pts: THREE.Vector2[] = [];
    const segs = 96;
    for (let i = 0; i < segs; i++) {
      const t = (i / segs) * Math.PI * 2;
      const p = bernabeuEnvelopePoint(t, 0.05);
      pts.push(new THREE.Vector2(p.x * step.scale, p.z * step.scale));
    }
    const shape = new THREE.Shape(pts);
    const geo = trackGeo(
      new THREE.ExtrudeGeometry(shape, {
        depth: step.height,
        bevelEnabled: false,
        curveSegments: 1,
      }),
    );
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, materials.concretePodium);
    mesh.position.y = step.y;
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    group.add(mesh);
  }

  // Paseo de la Castellana boulevard strip along West (-X)
  const roadGeo = trackGeo(new THREE.PlaneGeometry(36, 900));
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = materials.concretePodium;
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(-164, 0.04, 0);
  road.receiveShadow = true;
  group.add(road);

  // Stylized Madrid plane trees along Castellana & Plaza Sagrados Corazones
  const treeCoords: Array<[number, number]> = [];
  for (let z = -150; z <= 150; z += 18) {
    treeCoords.push([-140, z]);
    treeCoords.push([-186, z]);
  }
  for (let x = -110; x <= 110; x += 22) {
    treeCoords.push([x, 146]);
    treeCoords.push([x, -146]);
  }

  const treeCount = treeCoords.length;
  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.42, 4.2, 8));
  trunkGeo.translate(0, 2.1, 0);
  const canopyGeo = trackGeo(new THREE.DodecahedronGeometry(3.1, 1));
  canopyGeo.scale(1.0, 0.85, 1.0);
  canopyGeo.translate(0, 6.1, 0);

  const trunkInst = new THREE.InstancedMesh(
    trunkGeo,
    materials.treeTrunk,
    treeCount,
  );
  const canopyInst = new THREE.InstancedMesh(
    canopyGeo,
    materials.treeFoliage,
    treeCount,
  );
  trunkInst.castShadow = true;
  canopyInst.castShadow = true;
  canopyInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  treeCoords.forEach(([tx, tz], idx) => {
    const hash = Math.sin(idx * 12.9898) * 43758.5453;
    const frac = hash - Math.floor(hash);
    const scale = 0.85 + frac * 0.3;
    dummy.position.set(tx, 0.04, tz);
    dummy.rotation.set(0, frac * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    canopyInst.setMatrixAt(idx, dummy.matrix);

    tint.setHSL(0.32 + (frac - 0.5) * 0.04, 0.28, 0.28 + frac * 0.1);
    canopyInst.setColorAt(idx, tint);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  group.add(trunkInst, canopyInst);

  // Architectural plaza bollards around stadium perimeter
  const bollardCoords: Array<[number, number]> = [];
  const bollardCount = 36;
  for (let i = 0; i < bollardCount; i++) {
    const theta = (i / bollardCount) * Math.PI * 2;
    const p = bernabeuEnvelopePoint(theta, 0.05);
    bollardCoords.push([p.x * 1.13, p.z * 1.13]);
  }
  const bollardGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.18, 1.3, 8));
  bollardGeo.translate(0, 0.65, 0);
  const bollardInst = new THREE.InstancedMesh(
    bollardGeo,
    materials.structuralTruss,
    bollardCoords.length,
  );
  bollardCoords.forEach(([bx, bz], idx) => {
    dummy.position.set(bx, 0.04, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    bollardInst.setMatrixAt(idx, dummy.matrix);
  });
  bollardInst.instanceMatrix.needsUpdate = true;
  bollardInst.computeBoundingSphere();
  group.add(bollardInst);

  // Low-profile Madrid urban context blocks outside the plaza so horizon feels grounded
  const blockDefs: Array<[number, number, number, number, number]> = [
    [-295, -155, 48, 28, 62],
    [-295, -45, 44, 34, 72],
    [-295, 65, 48, 26, 68],
    [-295, 175, 52, 22, 58],
    [195, -135, 54, 22, 56],
    [198, -35, 50, 26, 74],
    [198, 65, 52, 24, 66],
    [195, 165, 56, 20, 52],
    [-85, -225, 68, 24, 46],
    [15, -225, 76, 28, 48],
    [105, -225, 58, 22, 46],
    [-85, 225, 66, 26, 48],
    [15, 225, 72, 24, 46],
    [105, 225, 60, 22, 48],
  ];
  const unitBox = trackGeo(new THREE.BoxGeometry(1, 1, 1));
  const blocksInst = new THREE.InstancedMesh(
    unitBox,
    materials.cityContext,
    blockDefs.length,
  );
  blockDefs.forEach(([bx, bz, bw, bh, bd], idx) => {
    dummy.position.set(bx, bh / 2, bz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(bw, bh, bd);
    dummy.updateMatrix();
    blocksInst.setMatrixAt(idx, dummy.matrix);
  });
  blocksInst.instanceMatrix.needsUpdate = true;
  blocksInst.computeBoundingSphere();
  group.add(blocksInst);

  return group;
}

function buildPitchAndBowl(
  materials: StadiumMaterialSet,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  trackMat: <T extends THREE.Material>(m: T) => T,
): { bowlGroup: THREE.Group; cutawayCore: THREE.Group } {
  const group = new THREE.Group();
  group.name = 'PitchAndSeatingBowl';
  const cutawayCore = new THREE.Group();
  group.add(cutawayCore);

  // Pitch sunken apron base & lush FIFA turf pitch clipped cleanly to Grada Baja superellipse
  const pitchOutline = new THREE.Shape();
  const pitchSegs = 64;
  for (let i = 0; i < pitchSegs; i++) {
    const theta = (i / pitchSegs) * Math.PI * 2;
    const p = superellipsePoint(theta, 43.4, 62.4, 5.2);
    if (i === 0) pitchOutline.moveTo(p.x, p.z);
    else pitchOutline.lineTo(p.x, p.z);
  }
  pitchOutline.closePath();

  const apronGeo = trackGeo(new THREE.ShapeGeometry(pitchOutline));
  apronGeo.rotateX(-Math.PI / 2);
  const apronBase = new THREE.Mesh(apronGeo, materials.concretePodium);
  apronBase.position.y = 0.98;
  apronBase.receiveShadow = true;
  group.add(apronBase);

  const pitchGeo = trackGeo(new THREE.ShapeGeometry(pitchOutline));
  // Map planar UVs so 84x122 FIFA pitch texture aligns with exact 105x68 goalposts
  const pPos = pitchGeo.attributes.position;
  const pUvs = new Float32Array(pPos.count * 2);
  for (let i = 0; i < pPos.count; i++) {
    const px = pPos.getX(i);
    const pz = pPos.getY(i);
    pUvs[i * 2] = px / STADIUM_DIMS.fieldApronWidth + 0.5;
    pUvs[i * 2 + 1] = -pz / STADIUM_DIMS.fieldApronLength + 0.5;
  }
  pitchGeo.setAttribute('uv', new THREE.BufferAttribute(pUvs, 2));
  pitchGeo.rotateX(-Math.PI / 2);
  // Flip triangle winding after -PI/2 rotation so front face points +Y (up)
  const pitchMesh = new THREE.Mesh(pitchGeo, materials.pitchTurf);
  pitchMesh.position.y = 1.05;
  pitchMesh.receiveShadow = true;
  group.add(pitchMesh);

  // North & South Goalposts (7.32m wide x 2.44m tall)
  const netMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      wireframe: true,
    }),
  );

  const buildGoal = (zPos: number, dir: number) => {
    const g = new THREE.Group();
    const postGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 2.44, 8));
    const barGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 7.48, 8));
    barGeo.rotateZ(Math.PI / 2);

    const leftPost = new THREE.Mesh(postGeo, materials.goalWhite);
    leftPost.position.set(-3.66, 1.22, 0);
    const rightPost = new THREE.Mesh(postGeo, materials.goalWhite);
    rightPost.position.set(3.66, 1.22, 0);
    const crossbar = new THREE.Mesh(barGeo, materials.goalWhite);
    crossbar.position.set(0, 2.44, 0);

    // Rear net support frame
    const backBar = new THREE.Mesh(barGeo, materials.goalWhite);
    backBar.position.set(0, 2.2, dir * 1.9);
    const netGeo = trackGeo(new THREE.BoxGeometry(7.32, 2.2, 1.9));
    const netMesh = new THREE.Mesh(netGeo, netMat);
    netMesh.position.set(0, 1.15, dir * 0.95);

    g.add(leftPost, rightPost, crossbar, backBar, netMesh);
    g.position.set(0, 1.05, zPos);
    return g;
  };
  group.add(buildGoal(-STADIUM_DIMS.pitchLength / 2, -1));
  group.add(buildGoal(STADIUM_DIMS.pitchLength / 2, 1));

  // Technical dugouts on West touchline
  const dugoutGeo = trackGeo(new THREE.BoxGeometry(2.2, 2.1, 10));
  [-14, 14].forEach((dz) => {
    const dugout = new THREE.Mesh(dugoutGeo, materials.skywalkGlass);
    dugout.position.set(-STADIUM_DIMS.pitchWidth / 2 - 3.6, 2.1, dz);
    group.add(dugout);
  });

  // 4 Steep Superelliptical Seating Tiers (Grada Baja, Tribuna, Anfiteatro 1, Anfiteatro 2)
  const tiers = [
    {
      innerX: 43,
      innerZ: 62,
      outerX: 60,
      outerZ: 80,
      yStart: 1.6,
      yEnd: 11.5,
      fasciaTop: true,
    },
    {
      innerX: 59,
      innerZ: 79,
      outerX: 73,
      outerZ: 94,
      yStart: 12.2,
      yEnd: 23.0,
      fasciaTop: true,
    },
    {
      innerX: 71,
      innerZ: 92,
      outerX: 83,
      outerZ: 105,
      yStart: 24.4,
      yEnd: 34.0,
      fasciaTop: true,
    },
    {
      innerX: 80,
      innerZ: 102,
      outerX: 91,
      outerZ: 114,
      yStart: 35.0,
      yEnd: 44.5,
      fasciaTop: true,
    },
  ];

  const radialSegs = 96;
  for (const tier of tiers) {
    const geo = buildSweptBowlRing(
      tier.innerX,
      tier.innerZ,
      tier.outerX,
      tier.outerZ,
      tier.yStart,
      tier.yEnd,
      radialSegs,
    );
    trackGeo(geo);
    const tierMesh = new THREE.Mesh(geo, materials.seatingBowl);
    tierMesh.receiveShadow = true;
    tierMesh.castShadow = true;
    group.add(tierMesh);

    // Concrete / white architectural fascia ring at the front edge of each tier
    const fasciaGeo = buildSweptBowlRing(
      tier.innerX - 0.5,
      tier.innerZ - 0.5,
      tier.innerX + 0.1,
      tier.innerZ + 0.1,
      tier.yStart - 1.1,
      tier.yStart + 0.15,
      radialSegs,
    );
    trackGeo(fasciaGeo);
    const fasciaMesh = new THREE.Mesh(fasciaGeo, materials.tierFascia);
    group.add(fasciaMesh);
  }

  // VIP Hospitality Glass Ribbon between Tribuna and Anfiteatro 1
  const vipGeo = buildSweptBowlRing(
    71.5,
    92.5,
    72.5,
    93.5,
    22.8,
    24.6,
    radialSegs,
  );
  trackGeo(vipGeo);
  const vipMesh = new THREE.Mesh(vipGeo, materials.skywalkGlass);
  group.add(vipMesh);

  // Outer structural stadium drum backing behind seating, extended to crown (h=1.02)
  // Split for cutaway (South-West 0.42..1.05 PI)
  const fixedCoreGeo = buildSweptEnvelopeSegment(
    0.01,
    1.02,
    Math.PI * 1.05,
    Math.PI * 2.42,
    72,
    -2.2,
  );
  trackGeo(fixedCoreGeo);
  const fixedCoreMesh = new THREE.Mesh(fixedCoreGeo, materials.facadeBacking);
  fixedCoreMesh.receiveShadow = true;
  group.add(fixedCoreMesh);

  const cutCoreGeo = buildSweptEnvelopeSegment(
    0.01,
    1.02,
    Math.PI * 0.42,
    Math.PI * 1.05,
    36,
    -2.2,
  );
  trackGeo(cutCoreGeo);
  const cutCoreMesh = new THREE.Mesh(cutCoreGeo, materials.facadeBacking);
  cutCoreMesh.receiveShadow = true;
  cutawayCore.add(cutCoreMesh);

  // 4 Corner Architectural Concrete & Steel Access Towers (positioned neatly outside upper bowl)
  const towerAngles = [
    Math.PI * 0.25,
    Math.PI * 0.75, // South-West corner (moves with cutaway)
    Math.PI * 1.25,
    Math.PI * 1.75,
  ];
  const towerCylGeo = trackGeo(new THREE.CylinderGeometry(4.0, 4.6, 44.0, 24));
  const towerCapGeo = trackGeo(new THREE.CylinderGeometry(4.3, 4.3, 1.0, 24));
  for (const ang of towerAngles) {
    const pt = superellipsePoint(ang, 95, 117, 3.25);
    const towerGroup = new THREE.Group();
    const shaft = new THREE.Mesh(towerCylGeo, materials.concretePodium);
    shaft.position.y = 22.0;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    const cap = new THREE.Mesh(towerCapGeo, materials.structuralTruss);
    cap.position.y = 44.5;
    towerGroup.add(shaft, cap);
    towerGroup.position.set(pt.x, 0, pt.z);
    if (Math.abs(ang - Math.PI * 0.75) < 0.05) {
      cutawayCore.add(towerGroup);
    } else {
      group.add(towerGroup);
    }
  }

  return { bowlGroup: group, cutawayCore };
}

function buildSweepingFacade(
  materials: StadiumMaterialSet,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): { facadeGroup: THREE.Group; frontCutawayFacade: THREE.Group } {
  const facadeGroup = new THREE.Group();
  facadeGroup.name = 'SweepingSteelFacade';

  const fixedFacade = new THREE.Group();
  const frontCutawayFacade = new THREE.Group();
  facadeGroup.add(fixedFacade, frontCutawayFacade);

  // 28 sculptural horizontal stainless-steel louver slats wrapping the asymmetric envelope
  // Skipping slats around the Skywalk 360 panoramic gallery (h in [0.82, 0.895])
  const totalBands = 28;
  const bandHeight = STADIUM_DIMS.facadeHeight / totalBands;

  for (let b = 0; b < totalBands; b++) {
    const h0 = (b + 0.14) / totalBands;
    const h1 = (b + 0.88) / totalBands;
    const hMid = (h0 + h1) * 0.5;

    // Leave open panoramic Skywalk 360 glazed gallery band near the upper crown
    if (hMid > 0.82 && hMid < 0.895) continue;

    // Fixed portion wraps North, East, and South-East
    const fixedGeo = buildLouverRibbonSegment(
      h0,
      h1,
      Math.PI * 1.05,
      Math.PI * 2.42,
      84,
      bandHeight * 0.42,
    );
    trackGeo(fixedGeo);
    const fixedMesh = new THREE.Mesh(fixedGeo, materials.steelLouver);
    fixedMesh.castShadow = true;
    fixedMesh.receiveShadow = true;
    fixedFacade.add(fixedMesh);

    // Cutaway-ready portion covers the camera-facing South-West flank (0.42*PI to 1.05*PI)
    const cutGeo = buildLouverRibbonSegment(
      h0,
      h1,
      Math.PI * 0.42,
      Math.PI * 1.05,
      40,
      bandHeight * 0.42,
    );
    trackGeo(cutGeo);
    const cutMesh = new THREE.Mesh(cutGeo, materials.steelLouver);
    cutMesh.castShadow = true;
    cutMesh.receiveShadow = true;
    frontCutawayFacade.add(cutMesh);
  }

  // Glazed Skywalk 360 panoramic observation ring (also split for cutaway)
  const skywalkFixedGeo = buildSweptEnvelopeSegment(
    0.82,
    0.895,
    Math.PI * 1.05,
    Math.PI * 2.42,
    72,
    -0.45,
  );
  trackGeo(skywalkFixedGeo);
  fixedFacade.add(new THREE.Mesh(skywalkFixedGeo, materials.skywalkGlass));

  const skywalkCutGeo = buildSweptEnvelopeSegment(
    0.82,
    0.895,
    Math.PI * 0.42,
    Math.PI * 1.05,
    36,
    -0.45,
  );
  trackGeo(skywalkCutGeo);
  frontCutawayFacade.add(new THREE.Mesh(skywalkCutGeo, materials.skywalkGlass));

  // Sleek stainless-steel crown trim band framing the top roof lip
  const crownGeo = buildLouverRibbonSegment(
    0.975,
    1.015,
    Math.PI * 1.05,
    Math.PI * 2.42,
    84,
    1.4,
  );
  trackGeo(crownGeo);
  const crownMesh = new THREE.Mesh(crownGeo, materials.steelLouver);
  crownMesh.castShadow = true;
  fixedFacade.add(crownMesh);

  const crownCutGeo = buildLouverRibbonSegment(
    0.975,
    1.015,
    Math.PI * 0.42,
    Math.PI * 1.05,
    36,
    1.4,
  );
  trackGeo(crownCutGeo);
  const crownCutMesh = new THREE.Mesh(crownCutGeo, materials.steelLouver);
  crownCutMesh.castShadow = true;
  frontCutawayFacade.add(crownCutMesh);

  // Paseo de la Castellana grand entrance canopy portal frame (-X)
  const portalArchGeo = trackGeo(new THREE.BoxGeometry(6.5, 1.4, 52));
  const portalArch = new THREE.Mesh(portalArchGeo, materials.steelLouver);
  portalArch.position.set(-STADIUM_DIMS.facadeHalfX - 18, 9.8, 0);
  portalArch.castShadow = true;
  fixedFacade.add(portalArch);

  const portalPillarGeo = trackGeo(new THREE.CylinderGeometry(0.75, 0.9, 9.6, 12));
  [-21, 21].forEach((pz) => {
    const pillar = new THREE.Mesh(portalPillarGeo, materials.structuralTruss);
    pillar.position.set(-STADIUM_DIMS.facadeHalfX - 18, 4.8, pz);
    pillar.castShadow = true;
    fixedFacade.add(pillar);
  });

  return { facadeGroup, frontCutawayFacade };
}

function buildRoofAndHalo(
  materials: StadiumMaterialSet,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): {
  roofCapGroup: THREE.Group;
  northRoofLeaf: THREE.Group;
  southRoofLeaf: THREE.Group;
} {
  const roofCapGroup = new THREE.Group();
  roofCapGroup.name = 'RoofAndHaloSystem';

  // 1. Fixed Perimeter Outer Roof Canopy connecting facade crown to rectangular oculus
  const radialSegs = 144;
  const ringSegs = 12;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let r = 0; r <= ringSegs; r++) {
    const tRing = r / ringSegs; // 0 = outer crown, 1 = inner oculus rim
    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const theta = u * Math.PI * 2;
      const outer = bernabeuEnvelopePoint(theta, 1.0);
      const inner = superellipsePoint(
        theta,
        STADIUM_DIMS.oculusHalfX,
        STADIUM_DIMS.oculusHalfZ,
        4.4,
      );
      const px = THREE.MathUtils.lerp(outer.x, inner.x, tRing);
      const pz = THREE.MathUtils.lerp(outer.z, inner.z, tRing);
      const py = roofElevationAt(
        px / STADIUM_DIMS.facadeHalfX,
        pz / STADIUM_DIMS.facadeHalfZ,
      );

      positions.push(px, py, pz);
      uvs.push(u * 6, tRing);
    }
  }

  for (let r = 0; r < ringSegs; r++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = r * (radialSegs + 1) + s;
      const b = a + radialSegs + 1;
      indices.push(a, b, a + 1);
      indices.push(b, b + 1, a + 1);
    }
  }

  const roofRingGeo = trackGeo(new THREE.BufferGeometry());
  roofRingGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  roofRingGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roofRingGeo.setIndex(indices);
  roofRingGeo.computeVertexNormals();

  const roofRingMesh = new THREE.Mesh(roofRingGeo, materials.roofCanopySteel);
  roofRingMesh.castShadow = true;
  roofRingMesh.receiveShadow = true;
  roofCapGroup.add(roofRingMesh);

  // Perimeter soffit skirt sealing the gap between outer arched roof lip and facade crown
  const skirtPos: number[] = [];
  const skirtIdx: number[] = [];
  for (let s = 0; s <= radialSegs; s++) {
    const theta = (s / radialSegs) * Math.PI * 2;
    const outer = bernabeuEnvelopePoint(theta, 1.0);
    const pyTop = roofElevationAt(
      outer.x / STADIUM_DIMS.facadeHalfX,
      outer.z / STADIUM_DIMS.facadeHalfZ,
    );
    skirtPos.push(outer.x, STADIUM_DIMS.facadeHeight - 2.2, outer.z);
    skirtPos.push(outer.x, pyTop + 0.05, outer.z);
  }
  for (let s = 0; s < radialSegs; s++) {
    const a = s * 2;
    skirtIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const skirtGeo = trackGeo(new THREE.BufferGeometry());
  skirtGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(skirtPos, 3),
  );
  skirtGeo.setIndex(skirtIdx);
  skirtGeo.computeVertexNormals();
  roofCapGroup.add(new THREE.Mesh(skirtGeo, materials.structuralTruss));

  // 2. Exposed Structural Steel Mega-Trusses framing the oculus
  const trussLongGeo = trackGeo(
    new THREE.BoxGeometry(2.2, 2.8, STADIUM_DIMS.oculusHalfZ * 2 + 18),
  );
  [-STADIUM_DIMS.oculusHalfX - 1.2, STADIUM_DIMS.oculusHalfX + 1.2].forEach(
    (tx) => {
      const beam = new THREE.Mesh(trussLongGeo, materials.structuralTruss);
      beam.position.set(tx, STADIUM_DIMS.facadeHeight + 2.4, 0);
      beam.castShadow = true;
      roofCapGroup.add(beam);
    },
  );

  const trussCrossGeo = trackGeo(
    new THREE.BoxGeometry(STADIUM_DIMS.oculusHalfX * 2 + 12, 2.6, 2.4),
  );
  [-STADIUM_DIMS.oculusHalfZ - 1.2, STADIUM_DIMS.oculusHalfZ + 1.2].forEach(
    (tz) => {
      const beam = new THREE.Mesh(trussCrossGeo, materials.structuralTruss);
      beam.position.set(0, STADIUM_DIMS.facadeHeight + 2.0, tz);
      beam.castShadow = true;
      roofCapGroup.add(beam);
    },
  );

  // Radial cantilever roof trusses under the fixed roof ring
  const ribGeo = trackGeo(new THREE.BoxGeometry(1.1, 1.4, 34));
  const ribInst = new THREE.InstancedMesh(ribGeo, materials.structuralTruss, 24);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const theta = (i / 24) * Math.PI * 2;
    const outer = bernabeuEnvelopePoint(theta, 1.0);
    const inner = superellipsePoint(
      theta,
      STADIUM_DIMS.oculusHalfX,
      STADIUM_DIMS.oculusHalfZ,
      4.4,
    );
    const midX = (outer.x + inner.x) * 0.5;
    const midZ = (outer.z + inner.z) * 0.5;
    const dist = Math.hypot(outer.x - inner.x, outer.z - inner.z);
    dummy.position.set(midX, STADIUM_DIMS.facadeHeight + 1.2, midZ);
    dummy.rotation.set(0, Math.atan2(outer.x - inner.x, outer.z - inner.z), 0);
    dummy.scale.set(1, 1, Math.max(0.5, dist / 34));
    dummy.updateMatrix();
    ribInst.setMatrixAt(i, dummy.matrix);
  }
  ribInst.instanceMatrix.needsUpdate = true;
  ribInst.computeBoundingSphere();
  roofCapGroup.add(ribInst);

  // 3. 360-Degree Suspended LED Halo Scoreboard inside the bowl
  const haloGeo = buildSweptBowlRing(
    STADIUM_DIMS.oculusHalfX + 1.8,
    STADIUM_DIMS.oculusHalfZ + 1.8,
    STADIUM_DIMS.oculusHalfX + 1.9,
    STADIUM_DIMS.oculusHalfZ + 1.9,
    44.5,
    48.0,
    96,
    false,
  );
  trackGeo(haloGeo);
  const haloMesh = new THREE.Mesh(haloGeo, materials.haloScreen);
  roofCapGroup.add(haloMesh);

  // Perimeter LED Floodlight Pods mounted on inner oculus truss ring
  const podGeo = trackGeo(new THREE.BoxGeometry(3.2, 0.9, 1.4));
  const podInst = new THREE.InstancedMesh(
    podGeo,
    materials.floodlightEmitter,
    24,
  );
  for (let i = 0; i < 24; i++) {
    const theta = ((i + 0.5) / 24) * Math.PI * 2;
    const p = superellipsePoint(
      theta,
      STADIUM_DIMS.oculusHalfX + 0.6,
      STADIUM_DIMS.oculusHalfZ + 0.6,
      4.4,
    );
    dummy.position.set(p.x, 51.4, p.z);
    dummy.lookAt(0, 2, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    podInst.setMatrixAt(i, dummy.matrix);
  }
  podInst.instanceMatrix.needsUpdate = true;
  podInst.computeBoundingSphere();
  roofCapGroup.add(podInst);

  // 4. Retractable Two-Part Roof Leaves (North & South sliding arched panels)
  const buildRetractableLeaf = (zSign: -1 | 1) => {
    const leafGroup = new THREE.Group();
    const zMin = zSign === -1 ? -STADIUM_DIMS.oculusHalfZ - 1.5 : 0;
    const zMax = zSign === -1 ? 0 : STADIUM_DIMS.oculusHalfZ + 1.5;
    const xHalf = STADIUM_DIMS.oculusHalfX + 1.2;

    const segsX = 16;
    const segsZ = 10;
    const lPos: number[] = [];
    const lUv: number[] = [];
    const lIdx: number[] = [];

    for (let iz = 0; iz <= segsZ; iz++) {
      const vz = iz / segsZ;
      const pz = THREE.MathUtils.lerp(zMin, zMax, vz);
      for (let ix = 0; ix <= segsX; ix++) {
        const vx = ix / segsX;
        const px = THREE.MathUtils.lerp(-xHalf, xHalf, vx);
        const py =
          roofElevationAt(
            px / STADIUM_DIMS.facadeHalfX,
            pz / STADIUM_DIMS.facadeHalfZ,
          ) + 0.45;
        lPos.push(px, py, pz);
        lUv.push(vx * 3, vz * 3);
      }
    }

    for (let iz = 0; iz < segsZ; iz++) {
      for (let ix = 0; ix < segsX; ix++) {
        const a = iz * (segsX + 1) + ix;
        const b = a + segsX + 1;
        lIdx.push(a, b, a + 1);
        lIdx.push(b, b + 1, a + 1);
      }
    }

    const leafGeo = trackGeo(new THREE.BufferGeometry());
    leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(lPos, 3));
    leafGeo.setAttribute('uv', new THREE.Float32BufferAttribute(lUv, 2));
    leafGeo.setIndex(lIdx);
    leafGeo.computeVertexNormals();

    const leafMesh = new THREE.Mesh(leafGeo, materials.retractableMembrane);
    leafMesh.castShadow = true;
    leafMesh.receiveShadow = true;
    leafGroup.add(leafMesh);

    // Steel structural cross-ribs on each sliding leaf
    const ribBeamGeo = trackGeo(new THREE.BoxGeometry(xHalf * 2, 0.8, 0.9));
    for (let r = 1; r <= 4; r++) {
      const rz = THREE.MathUtils.lerp(zMin, zMax, r / 5);
      const rib = new THREE.Mesh(ribBeamGeo, materials.structuralTruss);
      const ry = roofElevationAt(0, rz / STADIUM_DIMS.facadeHalfZ) + 0.2;
      rib.position.set(0, ry, rz);
      leafGroup.add(rib);
    }

    return leafGroup;
  };

  const northRoofLeaf = buildRetractableLeaf(-1);
  const southRoofLeaf = buildRetractableLeaf(1);
  roofCapGroup.add(northRoofLeaf, southRoofLeaf);

  return { roofCapGroup, northRoofLeaf, southRoofLeaf };
}

/**
 * Builds the Futuristic Architectural Concept additions:
 * - Sculpted exterior titanium aero exo-fins & glowing crown/Skywalk light veins
 * - Expanded 5th cantilevered Sky-Tier (+15,000 seats -> 100,000 capacity)
 * - 12-petal kinetic iris solar-ETFE retractable roof
 */
function buildFuturisticConcept(
  materials: StadiumMaterialSet,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
): {
  futuristicExteriorGroup: THREE.Group;
  futuristicRoofGroup: THREE.Group;
  irisPetals: THREE.Group[];
  irisTotal: number;
} {
  const futuristicExteriorGroup = new THREE.Group();
  futuristicExteriorGroup.name = 'FuturisticExteriorConcept';
  futuristicExteriorGroup.visible = false;

  const futuristicRoofGroup = new THREE.Group();
  futuristicRoofGroup.name = 'FuturisticIrisRoof';
  futuristicRoofGroup.visible = false;

  // 1. 48 Parametric Curved Titanium Exo-Ribs hugging the asymmetric Bernabeu envelope
  const finCount = 48;
  const hSteps = 14;
  const ribPositions: number[] = [];
  const ribIndices: number[] = [];
  let vertOffset = 0;

  for (let f = 0; f < finCount; f++) {
    const theta = (f / finCount) * Math.PI * 2;
    // Skip South-West corner slightly less? No, all 48 ribs follow exact envelope
    for (let s = 0; s <= hSteps; s++) {
      const t = s / hSteps; // 0 = plaza base, 1 = roof shoulder
      const h = Math.min(1.0, t * 1.04);
      const env = bernabeuEnvelopePoint(theta, h);
      const len = Math.hypot(env.x, env.z) || 1;
      const nx = env.x / len;
      const nz = env.z / len;
      const tx = -nz;
      const tz = nx;

      // Smoothly arch inward onto the roof shoulder at the very top (t > 0.86)
      const shoulderTuck = t > 0.86 ? Math.pow((t - 0.86) / 0.14, 1.5) * 6.5 : 0;
      const finDepth = 0.8 + Math.sin(Math.PI * Math.pow(t, 0.85)) * 2.1;
      const halfThick = 0.34 * (1 - t * 0.25);

      const innerR = -0.3 - shoulderTuck;
      const outerR = finDepth - shoulderTuck;
      const py =
        t <= 0.9
          ? 0.9 + (t / 0.9) * (STADIUM_DIMS.facadeHeight - 0.9)
          : STADIUM_DIMS.facadeHeight +
            ((t - 0.9) / 0.1) *
              (roofElevationAt(
                (env.x - nx * shoulderTuck) / STADIUM_DIMS.facadeHalfX,
                (env.z - nz * shoulderTuck) / STADIUM_DIMS.facadeHalfZ,
              ) -
                STADIUM_DIMS.facadeHeight +
                0.75);

      // 4 vertices per ring cross-section: outer-L, outer-R, inner-R, inner-L
      ribPositions.push(
        env.x + nx * outerR - tx * halfThick,
        py,
        env.z + nz * outerR - tz * halfThick,

        env.x + nx * outerR + tx * halfThick,
        py,
        env.z + nz * outerR + tz * halfThick,

        env.x + nx * innerR + tx * halfThick,
        py,
        env.z + nz * innerR + tz * halfThick,

        env.x + nx * innerR - tx * halfThick,
        py,
        env.z + nz * innerR - tz * halfThick,
      );
    }

    for (let s = 0; s < hSteps; s++) {
      const r0 = vertOffset + s * 4;
      const r1 = r0 + 4;
      for (let side = 0; side < 4; side++) {
        const next = (side + 1) % 4;
        ribIndices.push(
          r0 + side,
          r1 + side,
          r0 + next,
          r0 + next,
          r1 + side,
          r1 + next,
        );
      }
    }
    vertOffset += (hSteps + 1) * 4;
  }

  const curvedRibsGeo = trackGeo(new THREE.BufferGeometry());
  curvedRibsGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(ribPositions, 3),
  );
  curvedRibsGeo.setIndex(ribIndices);
  curvedRibsGeo.computeVertexNormals();
  const curvedRibsMesh = new THREE.Mesh(
    curvedRibsGeo,
    materials.futuristicExoFin,
  );
  curvedRibsMesh.castShadow = true;
  futuristicExteriorGroup.add(curvedRibsMesh);

  // 2. Luminous Architectural Light Veins along Skywalk & Elliptical Oculus Rim
  const oculusRimGeo = buildSweptBowlRing(
    STADIUM_DIMS.oculusHalfX - 1.2,
    STADIUM_DIMS.oculusHalfZ - 1.2,
    STADIUM_DIMS.oculusHalfX + 4.8,
    STADIUM_DIMS.oculusHalfZ + 4.8,
    57.2,
    59.4,
    96,
  );
  trackGeo(oculusRimGeo);
  const oculusCollar = new THREE.Mesh(
    oculusRimGeo,
    materials.futuristicExoFin,
  );
  futuristicRoofGroup.add(oculusCollar);

  const oculusGlowGeo = buildSweptBowlRing(
    STADIUM_DIMS.oculusHalfX - 1.4,
    STADIUM_DIMS.oculusHalfZ - 1.4,
    STADIUM_DIMS.oculusHalfX - 0.6,
    STADIUM_DIMS.oculusHalfZ - 0.6,
    57.1,
    57.5,
    96,
  );
  trackGeo(oculusGlowGeo);
  futuristicRoofGroup.add(
    new THREE.Mesh(oculusGlowGeo, materials.futuristicLightTrim),
  );

  const crownVeinGeo = buildLouverRibbonSegment(
    0.855,
    0.866,
    0,
    Math.PI * 2,
    108,
    0.8,
  );
  trackGeo(crownVeinGeo);
  futuristicExteriorGroup.add(
    new THREE.Mesh(crownVeinGeo, materials.futuristicLightTrim),
  );

  // 3. Expanded 5th Cantilevered Sky-Tier ("Anfiteatro 3 · 100k Capacity")
  const skyTierGeo = buildSweptBowlRing(
    75,
    97,
    89,
    112,
    44.8,
    50.6,
    96,
  );
  trackGeo(skyTierGeo);
  const skyTierMesh = new THREE.Mesh(skyTierGeo, materials.seatingBowl);
  futuristicExteriorGroup.add(skyTierMesh);

  const skyTierFasciaGeo = buildSweptBowlRing(
    74.4,
    96.4,
    75.2,
    97.2,
    44.2,
    45.1,
    96,
  );
  trackGeo(skyTierFasciaGeo);
  futuristicExteriorGroup.add(
    new THREE.Mesh(skyTierFasciaGeo, materials.futuristicLightTrim),
  );

  // 4. 12-Petal Kinetic Iris Retractable Roof (elliptically scaled to match oculus with zero gap)
  const irisTotal = 12;
  const irisPetals: THREE.Group[] = [];

  const irisPivotGroup = new THREE.Group();
  irisPivotGroup.position.set(0, 59.5, 0);
  irisPivotGroup.scale.set(
    (STADIUM_DIMS.oculusHalfX + 4.5) / 53,
    1,
    (STADIUM_DIMS.oculusHalfZ + 4.5) / 53,
  );
  futuristicRoofGroup.add(irisPivotGroup);

  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.lineTo(54, -15);
  petalShape.quadraticCurveTo(61, 0, 54, 15);
  petalShape.closePath();

  const petalGlassGeo = trackGeo(
    new THREE.ExtrudeGeometry(petalShape, {
      depth: 0.35,
      bevelEnabled: false,
    }),
  );
  petalGlassGeo.rotateX(Math.PI / 2);

  const petalRibGeo = trackGeo(new THREE.BoxGeometry(55, 0.72, 0.9));
  petalRibGeo.translate(27.5, 0.25, 0);

  for (let i = 0; i < irisTotal; i++) {
    const petalGroup = new THREE.Group();
    const glassMesh = new THREE.Mesh(
      petalGlassGeo,
      materials.futuristicIrisGlass,
    );
    const ribMesh = new THREE.Mesh(petalRibGeo, materials.futuristicExoFin);
    const lightRib = new THREE.Mesh(
      petalRibGeo,
      materials.futuristicLightTrim,
    );
    lightRib.scale.set(0.95, 0.35, 0.35);
    lightRib.position.y = -0.35;

    petalGroup.add(glassMesh, ribMesh, lightRib);
    petalGroup.position.set(0, (i % 2) * 0.28, 0);
    petalGroup.rotation.y = (i / irisTotal) * Math.PI * 2;
    irisPivotGroup.add(petalGroup);
    irisPetals.push(petalGroup);
  }

  return {
    futuristicExteriorGroup,
    futuristicRoofGroup,
    irisPetals,
    irisTotal,
  };
}

/**
 * Helper: Builds a sculpted horizontal stainless-steel louver band wrapping
 * the asymmetric Bernabeu envelope between heightRatios h0 and h1 and angles thetaStart..thetaEnd.
 */
function buildLouverRibbonSegment(
  h0: number,
  h1: number,
  thetaStart: number,
  thetaEnd: number,
  segs: number,
  outwardFlare: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const y0 = h0 * STADIUM_DIMS.facadeHeight;
  const y1 = h1 * STADIUM_DIMS.facadeHeight;

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const theta = THREE.MathUtils.lerp(thetaStart, thetaEnd, u);
    const pBot = bernabeuEnvelopePoint(theta, h0);
    const pTop = bernabeuEnvelopePoint(theta, h1);

    // Outward louver blade tilt: top edge steps slightly outward for sunlit highlights
    const normLen = Math.hypot(pTop.x, pTop.z) || 1;
    const nx = pTop.x / normLen;
    const nz = pTop.z / normLen;

    // Lower Castellana portal arch cut on West (-X) near ground level
    const cosT = Math.cos(theta);
    const portalMask =
      cosT < -0.92 && y0 < 9.5
        ? (1 - (9.5 - y0) / 9.5) * 0.65
        : 0;

    positions.push(
      pBot.x,
      y0 + portalMask * 1.2,
      pBot.z,
      pTop.x + nx * outwardFlare,
      y1,
      pTop.z + nz * outwardFlare,
    );

    uvs.push(u * 6, 0, u * 6, 1);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper: Builds a swept shell segment around the Bernabeu envelope between thetaStart..thetaEnd.
 */
function buildSweptEnvelopeSegment(
  h0: number,
  h1: number,
  thetaStart: number,
  thetaEnd: number,
  segs: number,
  radialOffset: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const y0 = h0 * STADIUM_DIMS.facadeHeight;
  const y1 = h1 * STADIUM_DIMS.facadeHeight;

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const theta = THREE.MathUtils.lerp(thetaStart, thetaEnd, u);
    const p0 = bernabeuEnvelopePoint(theta, h0);
    const p1 = bernabeuEnvelopePoint(theta, h1);
    const len0 = Math.hypot(p0.x, p0.z) || 1;
    const len1 = Math.hypot(p1.x, p1.z) || 1;

    positions.push(
      p0.x + (p0.x / len0) * radialOffset,
      y0,
      p0.z + (p0.z / len0) * radialOffset,
      p1.x + (p1.x / len1) * radialOffset,
      y1,
      p1.z + (p1.z / len1) * radialOffset,
    );
    uvs.push(u * 8, 0, u * 8, 1);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b);
    indices.push(b, c, d);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Helper: Builds a swept superelliptical ring for interior seating tiers, fascia, and 360 halo.
 */
function buildSweptBowlRing(
  innerX: number,
  innerZ: number,
  outerX: number,
  outerZ: number,
  yInner: number,
  yOuter: number,
  segs: number,
  flipU = false,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segs; i++) {
    const u = i / segs;
    const theta = u * Math.PI * 2;
    const pIn = superellipsePoint(theta, innerX, innerZ, 4.0);
    const pOut = superellipsePoint(theta, outerX, outerZ, 3.8);

    positions.push(pIn.x, yInner, pIn.z, pOut.x, yOuter, pOut.z);
    const uvU = flipU ? 1 - u : u;
    uvs.push(uvU, 0, uvU, 1);
  }

  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
