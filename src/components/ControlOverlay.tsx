import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  Sunset,
} from 'lucide-react';
import {
  ATMOSPHERE_CONFIG,
  CAMERA_PRESETS,
  type AtmosphereMode,
  type CameraPresetId,
  type ConceptMode,
} from '../stadium/constants';

export interface ControlOverlayProps {
  cameraPreset: CameraPresetId;
  onSelectCamera: (id: CameraPresetId) => void;
  onResetView: () => void;
  atmosphere: AtmosphereMode;
  onSelectAtmosphere: (mode: AtmosphereMode) => void;
  roofOpen: boolean;
  onToggleRoof: () => void;
  cutaway: boolean;
  onToggleCutaway: () => void;
  concept: ConceptMode;
  onSelectConcept: (mode: ConceptMode) => void;
  onCaptureRender: () => void;
  hudCollapsed: boolean;
  onToggleHud: () => void;
}

const CAMERA_ORDER: CameraPresetId[] = [
  'aerial',
  'pitch',
  'spectator',
  'castellana',
  'skywalk',
];

const ATMOSPHERE_ORDER: AtmosphereMode[] = ['golden', 'night', 'daylight'];

export function ControlOverlay({
  cameraPreset,
  onSelectCamera,
  onResetView,
  atmosphere,
  onSelectAtmosphere,
  roofOpen,
  onToggleRoof,
  cutaway,
  onToggleCutaway,
  concept,
  onSelectConcept,
  onCaptureRender,
  hudCollapsed,
  onToggleHud,
}: ControlOverlayProps) {
  const activePreset = CAMERA_PRESETS[cameraPreset];
  const capacityText =
    concept === 'futuristic' ? '100,000 Capacity' : '85,000 Capacity';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top-Left Minimal Architectural Title Mark & Active View Highlight */}
      <header className="flex items-start justify-between">
        <div className="pointer-events-auto rounded-lg bg-[#0D131F]/88 px-4 py-2.5 border border-white/10 shadow-lg max-w-md">
          <h1 className="font-display text-base sm:text-lg font-semibold tracking-tight text-slate-50 leading-tight">
            Estadio Santiago Bernabéu
          </h1>
          <p className="mt-0.5 text-xs text-slate-300 flex flex-wrap items-center gap-1.5">
            <span>Madrid</span>
            <span aria-hidden="true">·</span>
            <span>
              {concept === 'futuristic'
                ? 'Futuristic Concept'
                : 'Paseo de la Castellana'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{capacityText}</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-400 leading-snug">
            {activePreset.highlight}
          </p>
        </div>
      </header>

      {/* Bottom-Center Collapsible Control Dock */}
      <div className="flex flex-col items-center w-full">
        {/* Collapse / Expand Drawer Handle */}
        <button
          type="button"
          onClick={onToggleHud}
          aria-expanded={!hudCollapsed}
          aria-controls="stadium-control-dock"
          className="pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-t-lg rounded-b-md bg-[#0D131F]/92 px-3 py-1.5 text-xs font-medium text-slate-200 border border-white/12 hover:bg-[#162033] hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap shrink-0"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {/* Unified Horizontal Dock (No backdrop-filter over WebGL) */}
        <nav
          id="stadium-control-dock"
          aria-label="Stadium viewer controls"
          className={`pointer-events-auto w-auto max-w-[96vw] rounded-xl bg-[#0D131F]/94 border border-white/12 shadow-2xl transition-all duration-200 ease-out ${
            hudCollapsed
              ? 'translate-y-[120%] opacity-0 pointer-events-none h-0 overflow-hidden border-0 p-0'
              : 'translate-y-0 opacity-100 p-2'
          }`}
        >
          <div className="flex flex-wrap xl:flex-nowrap items-center justify-center gap-2">
            {/* Camera Presets */}
            <div
              role="group"
              aria-label="Camera views"
              className="flex items-center gap-0.5 rounded-lg bg-[#080C14] p-1 border border-white/8"
            >
              {CAMERA_ORDER.map((id) => {
                const preset = CAMERA_PRESETS[id];
                const active = cameraPreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectCamera(id)}
                    aria-pressed={active}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                      active
                        ? 'bg-slate-100 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/6'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Architecture Edition Switch */}
            <div
              role="group"
              aria-label="Architectural edition"
              className="flex items-center gap-0.5 rounded-lg bg-[#080C14] p-1 border border-white/8"
            >
              <button
                type="button"
                onClick={() => onSelectConcept('classic')}
                aria-pressed={concept === 'classic'}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                  concept === 'classic'
                    ? 'bg-slate-200 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/6'
                }`}
              >
                Classic 2024
              </button>
              <button
                type="button"
                onClick={() => onSelectConcept('futuristic')}
                aria-pressed={concept === 'futuristic'}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                  concept === 'futuristic'
                    ? 'bg-sky-300 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/6'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Futuristic</span>
              </button>
            </div>

            {/* Atmosphere / Lighting Presets */}
            <div
              role="group"
              aria-label="Atmosphere lighting"
              className="flex items-center gap-0.5 rounded-lg bg-[#080C14] p-1 border border-white/8"
            >
              {ATMOSPHERE_ORDER.map((mode) => {
                const cfg = ATMOSPHERE_CONFIG[mode];
                const active = atmosphere === mode;
                const Icon =
                  mode === 'golden'
                    ? Sunset
                    : mode === 'night'
                      ? Moon
                      : Sun;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onSelectAtmosphere(mode)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                      active
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-white/6'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Architectural Toggles: Retractable Roof, Cutaway, Capture & Reset */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleRoof}
                aria-pressed={roofOpen}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                  roofOpen
                    ? 'bg-sky-400 text-slate-950 border-sky-300'
                    : 'bg-[#141C2B] text-slate-200 border-white/12 hover:bg-[#1C273B]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{roofOpen ? 'Roof Open' : 'Roof Closed'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleCutaway}
                aria-pressed={cutaway}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300 ${
                  cutaway
                    ? 'bg-amber-300 text-slate-950 border-amber-200'
                    : 'bg-[#141C2B] text-slate-200 border-white/12 hover:bg-[#1C273B]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cutaway</span>
              </button>

              <button
                type="button"
                onClick={onCaptureRender}
                aria-label="Save render PNG"
                title="Save render PNG"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#141C2B] text-slate-200 border border-white/12 hover:bg-[#1C273B] hover:text-white transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onResetView}
                aria-label="Reset camera view"
                title="Reset camera view"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#141C2B] text-slate-200 border border-white/12 hover:bg-[#1C273B] hover:text-white transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-300"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
