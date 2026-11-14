import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  ATMOSPHERE_CONFIG,
  CAMERA_PRESETS,
  type AtmosphereMode,
  type CameraPresetId,
  type ConceptMode,
} from '../stadium/constants';
import { dampValue } from '../stadium/math';
import { createStadiumTextures } from '../stadium/textures';
import { createStadiumMaterials } from '../stadium/materials';
import { buildBernabeu } from '../stadium/buildBernabeu';

export interface BernabeuViewportProps {
  cameraPreset: CameraPresetId;
  cameraRequestNonce: number;
  atmosphere: AtmosphereMode;
  roofOpen: boolean;
  cutaway: boolean;
  concept: ConceptMode;
  captureRequestNonce: number;
}

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _sunVec = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export function BernabeuViewport({
  cameraPreset,
  cameraRequestNonce,
  atmosphere,
  roofOpen,
  cutaway,
  concept,
  captureRequestNonce,
}: BernabeuViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const desiredStateRef = useRef({
    cameraPreset,
    cameraRequestNonce,
    atmosphere,
    roofOpen,
    cutaway,
    concept,
  });

  const triggerUpdateRef = useRef<(() => void) | null>(null);
  const triggerCameraGlideRef = useRef<((preset: CameraPresetId) => void) | null>(
    null,
  );
  const triggerAtmosphereRef = useRef<((mode: AtmosphereMode) => void) | null>(
    null,
  );
  const triggerCaptureRef = useRef<(() => void) | null>(null);

  // Sync latest React props into ref & schedule on-demand renders
  useEffect(() => {
    const prev = desiredStateRef.current;
    const presetChanged =
      prev.cameraPreset !== cameraPreset ||
      prev.cameraRequestNonce !== cameraRequestNonce;
    const atmoChanged = prev.atmosphere !== atmosphere;
    desiredStateRef.current = {
      cameraPreset,
      cameraRequestNonce,
      atmosphere,
      roofOpen,
      cutaway,
      concept,
    };

    document.body.dataset.camera = cameraPreset;
    document.body.dataset.atmosphere = atmosphere;
    document.body.dataset.roof = roofOpen ? 'open' : 'closed';
    document.body.dataset.cutaway = cutaway ? 'on' : 'off';
    document.body.dataset.concept = concept;

    if (presetChanged) {
      triggerCameraGlideRef.current?.(cameraPreset);
    }
    if (atmoChanged) {
      triggerAtmosphereRef.current?.(atmosphere);
    }
    triggerUpdateRef.current?.();
  }, [cameraPreset, cameraRequestNonce, atmosphere, roofOpen, cutaway, concept]);

  useEffect(() => {
    if (captureRequestNonce > 0) {
      triggerCaptureRef.current?.();
    }
  }, [captureRequestNonce]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    document.body.dataset.webgl = isSoftwareGl ? 'software' : 'hardware';

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = ATMOSPHERE_CONFIG[atmosphere].exposure;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      onContextRestored,
    );

    const scene = new THREE.Scene();
    const initialAtmo = ATMOSPHERE_CONFIG[desiredStateRef.current.atmosphere];
    scene.background = new THREE.Color(initialAtmo.skyColor);
    scene.fog = new THREE.FogExp2(initialAtmo.fogColor, initialAtmo.fogDensity);

    // Mandatory studio environment reflection (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // Procedural Sky dome for daytime / golden hour
    const sky = new Sky();
    sky.scale.setScalar(4500);
    scene.add(sky);

    // Camera & OrbitControls
    const initialPreset = CAMERA_PRESETS[desiredStateRef.current.cameraPreset];
    const camera = new THREE.PerspectiveCamera(
      initialPreset.fov,
      width / height,
      1,
      2500,
    );
    camera.position.set(...initialPreset.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 12;
    controls.maxDistance = 440;
    controls.maxPolarAngle = Math.PI * 0.62;
    controls.autoRotate = false;
    controls.update();

    // 3-Point Warm/Cool Studio + Architectural Outdoor Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      initialAtmo.hemiSky,
      initialAtmo.hemiGround,
      initialAtmo.hemiIntensity,
    );
    hemiLight.position.set(0, 120, 0);
    scene.add(hemiLight);

    const sunKeyLight = new THREE.DirectionalLight(
      initialAtmo.sunColor,
      initialAtmo.sunIntensity,
    );
    sunKeyLight.position.set(...initialAtmo.sunPosition);
    sunKeyLight.castShadow = !isSoftwareGl;
    sunKeyLight.shadow.mapSize.set(1024, 1024);
    const d = 175;
    sunKeyLight.shadow.camera.left = -d;
    sunKeyLight.shadow.camera.right = d;
    sunKeyLight.shadow.camera.top = d;
    sunKeyLight.shadow.camera.bottom = -d;
    sunKeyLight.shadow.camera.near = 20;
    sunKeyLight.shadow.camera.far = 550;
    sunKeyLight.shadow.bias = -0.0005;
    sunKeyLight.shadow.normalBias = 0.02;
    scene.add(sunKeyLight);

    const rimLight = new THREE.DirectionalLight(
      initialAtmo.rimColor,
      initialAtmo.rimIntensity,
    );
    rimLight.position.set(170, 85, -150);
    scene.add(rimLight);

    // Interior pitch stadium floodlight (unshadowed PointLight inside bowl)
    const pitchFloodLight = new THREE.PointLight(
      0xf4f8ff,
      initialAtmo.floodlightIntensity * 1350,
      260,
      1.6,
    );
    pitchFloodLight.position.set(0, 44, 0);
    scene.add(pitchFloodLight);

    // Procedural textures, PBR materials & composite Estadio Santiago Bernabéu geometry
    const textures = createStadiumTextures(
      renderer.capabilities.getMaxAnisotropy(),
    );
    const materials = createStadiumMaterials(textures, isSoftwareGl);
    const bernabeu = buildBernabeu(materials);
    scene.add(bernabeu.root);

    // Pre-warm shaders on GPU devices
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Apply atmosphere helper
    const applyAtmosphere = (mode: AtmosphereMode) => {
      const cfg = ATMOSPHERE_CONFIG[mode];
      renderer.toneMappingExposure = cfg.exposure;
      (scene.background as THREE.Color).setHex(cfg.skyColor);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.setHex(cfg.fogColor);
        scene.fog.density = cfg.fogDensity;
      }

      sunKeyLight.color.setHex(cfg.sunColor);
      sunKeyLight.intensity = cfg.sunIntensity;
      sunKeyLight.position.set(...cfg.sunPosition);

      hemiLight.color.setHex(cfg.hemiSky);
      hemiLight.groundColor.setHex(cfg.hemiGround);
      hemiLight.intensity = cfg.hemiIntensity;

      rimLight.color.setHex(cfg.rimColor);
      rimLight.intensity = cfg.rimIntensity;

      pitchFloodLight.intensity = cfg.floodlightIntensity * 1350;
      materials.facadeBacking.emissiveIntensity =
        mode === 'night' ? 0.36 : mode === 'golden' ? 0.09 : 0.02;
      materials.skywalkGlass.emissiveIntensity = cfg.interiorGlow * 0.35;
      materials.haloScreen.emissiveIntensity = 1.1 + cfg.interiorGlow * 0.45;
      materials.floodlightEmitter.emissiveIntensity =
        0.8 + cfg.floodlightIntensity * 0.9;
      materials.futuristicLightTrim.emissiveIntensity =
        mode === 'night' ? 1.85 : mode === 'golden' ? 1.3 : 0.75;

      // Update Sky shader uniforms
      const skyUniforms = sky.material.uniforms;
      skyUniforms['turbidity'].value = cfg.skyTurbidity;
      skyUniforms['rayleigh'].value = cfg.skyRayleigh;
      skyUniforms['mieCoefficient'].value = 0.005;
      skyUniforms['mieDirectionalG'].value = 0.82;

      const phi = THREE.MathUtils.degToRad(90 - cfg.skyElevation);
      const theta = THREE.MathUtils.degToRad(cfg.skyAzimuth);
      _sunVec.setFromSphericalCoords(1, phi, theta);
      skyUniforms['sunPosition'].value.copy(_sunVec);
      sky.visible = mode !== 'night';
    };

    applyAtmosphere(desiredStateRef.current.atmosphere);

    // Animation state (smooth damped transitions)
    let currentRoofOpen = desiredStateRef.current.roofOpen ? 1 : 0;
    let currentCutaway = desiredStateRef.current.cutaway ? 1 : 0;
    bernabeu.updateDynamicState(
      currentRoofOpen,
      currentCutaway,
      desiredStateRef.current.concept,
    );

    let cameraGliding = false;
    let activePreset = CAMERA_PRESETS[desiredStateRef.current.cameraPreset];
    let lastTime = performance.now();

    // Cancel scripted camera glide immediately if user drags or zooms manually
    const onControlStart = () => {
      cameraGliding = false;
    };
    controls.addEventListener('start', onControlStart);

    // On-demand render scheduler with software-WebGL afterDraw pacing
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;

        const now = performance.now();
        const delta = Math.min(0.15, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        let needsMoreFrames = false;

        // Smooth roof sliding transition
        const targetRoof = desiredStateRef.current.roofOpen ? 1 : 0;
        if (Math.abs(currentRoofOpen - targetRoof) > 0.004) {
          currentRoofOpen = dampValue(currentRoofOpen, targetRoof, 8.5, delta);
          needsMoreFrames = true;
        } else {
          currentRoofOpen = targetRoof;
        }

        // Smooth architectural cutaway transition
        const targetCutaway = desiredStateRef.current.cutaway ? 1 : 0;
        if (Math.abs(currentCutaway - targetCutaway) > 0.004) {
          currentCutaway = dampValue(currentCutaway, targetCutaway, 12.0, delta);
          needsMoreFrames = true;
        } else {
          currentCutaway = targetCutaway;
        }

        bernabeu.updateDynamicState(
          currentRoofOpen,
          currentCutaway,
          desiredStateRef.current.concept,
        );

        // Smooth camera preset glide
        if (cameraGliding) {
          _targetPos.set(...activePreset.position);
          _targetLook.set(...activePreset.target);
          const alpha = 1 - Math.exp(-9.5 * delta);
          camera.position.lerp(_targetPos, alpha);
          controls.target.lerp(_targetLook, alpha);

          if (Math.abs(camera.fov - activePreset.fov) > 0.05) {
            camera.fov = dampValue(camera.fov, activePreset.fov, 9.5, delta);
            camera.updateProjectionMatrix();
          }

          if (
            camera.position.distanceTo(_targetPos) < 0.45 &&
            controls.target.distanceTo(_targetLook) < 0.35 &&
            Math.abs(camera.fov - activePreset.fov) < 0.15
          ) {
            camera.position.copy(_targetPos);
            controls.target.copy(_targetLook);
            camera.fov = activePreset.fov;
            camera.updateProjectionMatrix();
            cameraGliding = false;
          } else {
            needsMoreFrames = true;
          }
        }

        controls.update();
        if (camera.position.y < 1.5) {
          camera.position.y = 1.5;
        }
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };

        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    const onControlsChange = () => {
      requestRender();
    };
    controls.addEventListener('change', onControlsChange);

    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', onResize);

    triggerUpdateRef.current = () => {
      lastTime = performance.now();
      requestRender();
    };
    triggerCameraGlideRef.current = (presetId: CameraPresetId) => {
      activePreset = CAMERA_PRESETS[presetId];
      cameraGliding = true;
      lastTime = performance.now();
      requestRender();
    };
    triggerAtmosphereRef.current = (mode: AtmosphereMode) => {
      applyAtmosphere(mode);
      requestRender();
    };
    triggerCaptureRef.current = () => {
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `santiago-bernabeu-${desiredStateRef.current.concept}-${desiredStateRef.current.cameraPreset}.png`;
      link.click();
    };

    // Initial render
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        onContextRestored,
      );
      bernabeu.dispose();
      materials.dispose();
      textures.dispose();
      envTexture.dispose();
      sky.geometry.dispose();
      sky.material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0B0F17]">
      <div
        ref={mountRef}
        data-testid="bernabeu-canvas-mount"
        className="w-full h-full"
        aria-label="Interactive 3D render of Estadio Santiago Bernabéu"
      />
      {contextLost && (
        <div
          role="alert"
          className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B0F17]/95 text-slate-100 p-6 text-center"
        >
          <div className="max-w-md space-y-2 border border-white/10 bg-[#121826] rounded-xl p-6">
            <h2 className="font-display text-lg font-semibold">
              3D Context Interrupted
            </h2>
            <p className="text-sm text-slate-300">
              WebGL rendering was paused by the browser. Reload the page or
              restore hardware acceleration to resume inspecting the stadium.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
