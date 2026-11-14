import { useCallback, useEffect, useState } from 'react';
import { BernabeuViewport } from './components/BernabeuViewport';
import { ControlOverlay } from './components/ControlOverlay';
import type {
  AtmosphereMode,
  CameraPresetId,
  ConceptMode,
} from './stadium/constants';

export default function App() {
  const [cameraPreset, setCameraPreset] = useState<CameraPresetId>('aerial');
  const [cameraRequestNonce, setCameraRequestNonce] = useState(0);
  const [atmosphere, setAtmosphere] = useState<AtmosphereMode>('golden');
  const [roofOpen, setRoofOpen] = useState(true);
  const [cutaway, setCutaway] = useState(false);
  const [concept, setConcept] = useState<ConceptMode>('classic');
  const [captureRequestNonce, setCaptureRequestNonce] = useState(0);
  const [hudCollapsed, setHudCollapsed] = useState(false);

  const handleSelectCamera = useCallback((id: CameraPresetId) => {
    setCameraPreset(id);
    setCameraRequestNonce((n) => n + 1);
  }, []);

  const handleResetView = useCallback(() => {
    setCameraPreset('aerial');
    setCameraRequestNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'h') setHudCollapsed((prev) => !prev);
      else if (key === 'r') setRoofOpen((prev) => !prev);
      else if (key === 'c') setCutaway((prev) => !prev);
      else if (key === 'f') {
        setConcept((prev) => (prev === 'classic' ? 'futuristic' : 'classic'));
      } else if (key === '1') handleSelectCamera('aerial');
      else if (key === '2') handleSelectCamera('pitch');
      else if (key === '3') handleSelectCamera('spectator');
      else if (key === '4') handleSelectCamera('castellana');
      else if (key === '5') handleSelectCamera('skywalk');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSelectCamera]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0B0F17]">
      <BernabeuViewport
        cameraPreset={cameraPreset}
        cameraRequestNonce={cameraRequestNonce}
        atmosphere={atmosphere}
        roofOpen={roofOpen}
        cutaway={cutaway}
        concept={concept}
        captureRequestNonce={captureRequestNonce}
      />
      <ControlOverlay
        cameraPreset={cameraPreset}
        onSelectCamera={handleSelectCamera}
        onResetView={handleResetView}
        atmosphere={atmosphere}
        onSelectAtmosphere={setAtmosphere}
        roofOpen={roofOpen}
        onToggleRoof={() => setRoofOpen((prev) => !prev)}
        cutaway={cutaway}
        onToggleCutaway={() => setCutaway((prev) => !prev)}
        concept={concept}
        onSelectConcept={setConcept}
        onCaptureRender={() => setCaptureRequestNonce((n) => n + 1)}
        hudCollapsed={hudCollapsed}
        onToggleHud={() => setHudCollapsed((prev) => !prev)}
      />
    </main>
  );
}
