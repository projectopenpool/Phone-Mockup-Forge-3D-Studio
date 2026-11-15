import React, { useState } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCcw,
  Smartphone,
  Type,
  Shapes,
  Sliders,
  Upload,
  PanelRightClose,
  PanelRightOpen,
  Box,
  Plus,
  Trash2,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { DEVICE_LIST, DEVICE_SPECS } from '../data/devices';
import {
  CanvasLayer,
  DeviceLayer,
  DeviceModelId,
  ShapeLayer,
  SlideDesign,
  TextLayer,
  UploadedScreenshot,
} from '../types/studio';

interface RightPropertiesPanelProps {
  activeSlide: SlideDesign;
  selectedLayerIds: string[];
  uploadedScreenshots: UploadedScreenshot[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer) => void;
  onUpdateAllDevicesOnSlide: (updater: (dev: DeviceLayer) => DeviceLayer) => void;
  onApplyDeviceModelToAllSlides: (deviceId: DeviceModelId) => void;
  onUploadScreenshotForDevice: (deviceLayerId: string, file: File) => void;
  onAlignLayer: (layerId: string, alignment: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') => void;
  onAddTextLayer: (preset: 'hero' | 'title' | 'kicker' | 'body' | 'gradient-display' | 'pill-tag') => void;
  onUploadStickerImage: (file: File) => void;
  onAddDeviceLayer: (deviceId: DeviceModelId, asClay?: boolean) => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
}

const FONT_FAMILIES = [
  'Plus Jakarta Sans',
  'Outfit',
  'Bricolage Grotesque',
  'Manrope',
  'DM Sans',
  'Oswald',
  'Barlow Condensed',
  'Fraunces',
  'Playfair Display',
  'JetBrains Mono',
];

const CLAY_FINISH_SWATCHES = [
  { name: 'Chalk White', hex: '#F8FAFC' },
  { name: 'Warm Sand', hex: '#F5E6D3' },
  { name: 'Terracotta', hex: '#EA580C' },
  { name: 'Cobalt Clay', hex: '#4F46E5' },
  { name: 'Sage Mint', hex: '#10B981' },
  { name: 'Rose Clay', hex: '#F43F5E' },
  { name: 'Lavender', hex: '#A855F7' },
  { name: 'Matte Slate', hex: '#334155' },
];

export const RightPropertiesPanel: React.FC<RightPropertiesPanelProps> = ({
  activeSlide,
  selectedLayerIds,
  uploadedScreenshots,
  isCollapsed,
  onToggleCollapse,
  onUpdateLayer,
  onUpdateAllDevicesOnSlide,
  onApplyDeviceModelToAllSlides,
  onUploadScreenshotForDevice,
  onAlignLayer,
  onAddTextLayer,
  onUploadStickerImage,
  onAddDeviceLayer,
  onDeleteLayer,
  onDuplicateLayer,
}) => {
  const [syncSlideDevices, setSyncSlideDevices] = useState<boolean>(true);
  const primaryId = selectedLayerIds[0];
  const layer = activeSlide.layers.find((l) => l.id === primaryId);
  const slideDeviceCount = activeSlide.layers.filter((l) => l.type === 'device').length;

  if (isCollapsed) {
    return (
      <aside className="w-10 shrink-0 h-full border-l border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#090D15] flex flex-col items-center py-3 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand Inspector Panel"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  const quickAddBar = (
    <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/25 border border-indigo-200/80 dark:border-indigo-500/30 space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
        <span>Add to Current Layout</span>
        <Plus className="w-3 h-3" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onAddTextLayer('title')}
          className="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs"
        >
          <Type className="w-3.5 h-3.5" />
          + Add Text
        </button>
        <label className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-2xs">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          + Add Image
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUploadStickerImage(file);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => onAddTextLayer('hero')}
          className="py-1 px-1.5 rounded bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate"
        >
          + Headline
        </button>
        <button
          type="button"
          onClick={() => onAddTextLayer('pill-tag')}
          className="py-1 px-1.5 rounded bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate"
        >
          + Pill Tag
        </button>
        <button
          type="button"
          onClick={() => onAddDeviceLayer('iphone-17-pro-max', false)}
          className="py-1 px-1.5 rounded bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate"
        >
          + 3D Phone
        </button>
      </div>
    </div>
  );

  if (!layer) {
    return (
      <aside className="w-[248px] shrink-0 h-full border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D121D] text-slate-900 dark:text-slate-100 p-3.5 overflow-y-auto select-none space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-100 font-bold text-xs uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Inspector</span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Inspector"
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>

        {quickAddBar}

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {activeSlide.name}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Click any 3D phone, text, or image layer on the canvas to edit or remove it—or use the buttons above to add new text and images.
          </p>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Total Layers</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {activeSlide.layers.length}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>3D Devices</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {activeSlide.layers.filter((l) => l.type === 'device').length}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-slate-900/60 border border-indigo-100 dark:border-slate-800 space-y-1.5">
          <div className="text-[11px] font-bold text-indigo-900 dark:text-slate-300">
            Quick Interactions
          </div>
          <ul className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1 leading-relaxed">
            <li>• Select a 3D phone and toggle <strong>3D Tilt</strong> to orbit X & Y directly on canvas.</li>
            <li>• Switch any phone between <strong>Anodized Metal</strong> and <strong>3D Matte Clay</strong>.</li>
            <li>• Enable <strong>Panorama Strip</strong> in the toolbar to inspect continuous backgrounds.</li>
          </ul>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[248px] shrink-0 h-full border-l border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D121D] text-slate-900 dark:text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Compact Header */}
      <div className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/30">
        <div className="flex items-center gap-1.5 min-w-0">
          {layer.type === 'device' && (
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          {layer.type === 'text' && (
            <Type className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          {layer.type === 'shape' && (
            <Shapes className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          )}
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
            {layer.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDuplicateLayer(layer.id)}
            title="Duplicate Layer (Ctrl+D)"
            className="p-1 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteLayer(layer.id)}
            title="Remove / Delete Layer (Del)"
            className="p-1 rounded-md text-rose-500 hover:text-white hover:bg-rose-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse Inspector"
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {quickAddBar}

        {/* Quick Canvas Alignment & Layer Removal Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              Canvas Alignment
            </span>
            <button
              type="button"
              onClick={() => onDeleteLayer(layer.id)}
              className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
            >
              <Trash2 className="w-3 h-3" />
              Remove Layer
            </button>
          </div>
          <div className="grid grid-cols-6 gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {(
              [
                ['left', 'L'],
                ['center-x', 'CX'],
                ['right', 'R'],
                ['top', 'T'],
                ['center-y', 'CY'],
                ['bottom', 'B'],
              ] as const
            ).map(([alignKey, shortLabel]) => (
              <button
                key={alignKey}
                type="button"
                onClick={() => onAlignLayer(layer.id, alignKey)}
                className="py-1 rounded text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-white transition-colors"
                title={`Align ${alignKey}`}
              >
                {shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================
            1. 3D DEVICE LAYER INSPECTOR (Metal + 3D Matte Clay)
           ============================================================ */}
        {layer.type === 'device' &&
          (() => {
            const devLayer = layer as DeviceLayer;
            const spec = DEVICE_SPECS[devLayer.deviceId] || DEVICE_SPECS['iphone-17-pro-max'];
            const applyDeviceChange = (updater: (d: DeviceLayer) => DeviceLayer) => {
              if (syncSlideDevices && slideDeviceCount > 1) {
                onUpdateAllDevicesOnSlide(updater);
              } else {
                onUpdateLayer(devLayer.id, (l) => updater(l as DeviceLayer));
              }
            };

            return (
              <>
                {/* Hardware Model & Material Mode */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      3D Hardware Model
                    </span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {spec.displayDiagonal}
                    </span>
                  </div>
                  <select
                    value={devLayer.deviceId}
                    onChange={(e) => {
                      const nextId = e.target.value as DeviceModelId;
                      const nextSpec = DEVICE_SPECS[nextId];
                      applyDeviceChange((d) => ({
                        ...d,
                        deviceId: nextId,
                        finishId: nextSpec.finishes[0].id,
                      }));
                    }}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <optgroup label="Apple iPhone 17 & 16">
                      {DEVICE_LIST.filter((d) => d.platform === 'apple').map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.displayDiagonal})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Android Flagships">
                      {DEVICE_LIST.filter((d) => d.platform === 'android').map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.displayDiagonal})
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {slideDeviceCount > 1 && (
                    <label className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-500/30 text-[10px] font-semibold text-indigo-800 dark:text-indigo-200 cursor-pointer">
                      <span>Sync all {slideDeviceCount} phones on this slide</span>
                      <input
                        type="checkbox"
                        checked={syncSlideDevices}
                        onChange={(e) => setSyncSlideDevices(e.target.checked)}
                        className="accent-indigo-600"
                      />
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={() => onApplyDeviceModelToAllSlides(devLayer.deviceId)}
                    className="w-full py-1 px-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-semibold transition-colors"
                  >
                    Apply {spec.shortName} to All Slides
                  </button>

                  {/* 3D Material Mode Switch: Realistic Metal vs 3D Matte Clay */}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                      3D Chassis Material
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-950 rounded-lg border border-slate-300/60 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() =>
                          applyDeviceChange((d) => ({
                            ...d,
                            isClayMaterial: false,
                          }))
                        }
                        className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                          !devLayer.isClayMaterial
                            ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Anodized Metal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyDeviceChange((d) => ({
                            ...d,
                            isClayMaterial: true,
                            clayColor: d.clayColor || '#F8FAFC',
                          }))
                        }
                        className={`py-1 rounded text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                          devLayer.isClayMaterial
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Box className="w-3 h-3" />
                        3D Matte Clay
                      </button>
                    </div>
                  </div>

                  {/* Finish Swatches (Clay vs Metal) */}
                  {devLayer.isClayMaterial ? (
                    <div className="pt-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>Clay Sculpt Color</span>
                        <input
                          type="color"
                          value={devLayer.clayColor || '#F8FAFC'}
                          onChange={(e) =>
                            applyDeviceChange((d) => ({
                              ...d,
                              clayColor: e.target.value,
                            }))
                          }
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {CLAY_FINISH_SWATCHES.map((sw) => (
                          <button
                            key={sw.hex}
                            type="button"
                            onClick={() =>
                              applyDeviceChange((d) => ({
                                ...d,
                                clayColor: sw.hex,
                              }))
                            }
                            title={sw.name}
                            className={`h-6 rounded-md border transition-transform hover:scale-105 ${
                              devLayer.clayColor === sw.hex
                                ? 'ring-2 ring-indigo-500 border-indigo-500'
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                            style={{ backgroundColor: sw.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-1 space-y-1">
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Hardware Finish
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {spec.finishes.map((fin) => (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() =>
                              applyDeviceChange((d) => ({
                                ...d,
                                finishId: fin.id,
                                customFinishColor: undefined,
                              }))
                            }
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-colors ${
                              devLayer.finishId === fin.id && !devLayer.customFinishColor
                                ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-slate-900 dark:text-white'
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-white/25 shrink-0"
                              style={{ backgroundColor: fin.frameHex }}
                            />
                            <span className="text-[10px] font-medium truncate">{fin.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3D Rotation, Tilt & Perspective */}
                <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      3D Angles & Perspective
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateLayer(devLayer.id, (l) => ({
                          ...(l as DeviceLayer),
                          rotationX: 0,
                          rotationY: 0,
                          rotationZ: 0,
                          fov: 35,
                        }))
                      }
                      className="text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-white flex items-center gap-0.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { label: 'Front', rx: 0, ry: 0, rz: 0 },
                      { label: 'Iso R', rx: -10, ry: 24, rz: -4 },
                      { label: 'Iso L', rx: -10, ry: -24, rz: 4 },
                      { label: 'Float 3D', rx: -22, ry: -30, rz: -12 },
                      { label: 'Side Rail', rx: -6, ry: 52, rz: 0 },
                      { label: 'Rear Cam', rx: 8, ry: 156, rz: -4 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          onUpdateLayer(devLayer.id, (l) => ({
                            ...(l as DeviceLayer),
                            rotationX: preset.rx,
                            rotationY: preset.ry,
                            rotationZ: preset.rz,
                          }))
                        }
                        className="py-1 px-1.5 rounded bg-white dark:bg-slate-950 hover:bg-indigo-50 dark:hover:bg-indigo-600/25 border border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Pitch (X)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {devLayer.rotationX}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-65}
                        max={65}
                        step={1}
                        value={devLayer.rotationX}
                        onChange={(e) =>
                          onUpdateLayer(devLayer.id, (l) => ({
                            ...(l as DeviceLayer),
                            rotationX: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Yaw (Y)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {devLayer.rotationY}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={devLayer.rotationY}
                        onChange={(e) =>
                          onUpdateLayer(devLayer.id, (l) => ({
                            ...(l as DeviceLayer),
                            rotationY: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Roll (Z)</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {devLayer.rotationZ}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-90}
                        max={90}
                        step={1}
                        value={devLayer.rotationZ}
                        onChange={(e) =>
                          onUpdateLayer(devLayer.id, (l) => ({
                            ...(l as DeviceLayer),
                            rotationZ: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Device Scale</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {Math.round(devLayer.scale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.35}
                        max={1.55}
                        step={0.01}
                        value={devLayer.scale}
                        onChange={(e) =>
                          onUpdateLayer(devLayer.id, (l) => ({
                            ...(l as DeviceLayer),
                            scale: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Screen Image Replacement */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Screen Content
                  </div>

                  <label className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Replace Screen Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadScreenshotForDevice(devLayer.id, file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {uploadedScreenshots.length > 0 && (
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {uploadedScreenshots.map((shot) => (
                        <button
                          key={shot.id}
                          type="button"
                          onClick={() =>
                            onUpdateLayer(devLayer.id, (l) => ({
                              ...(l as DeviceLayer),
                              screenshotUrl: shot.dataUrl,
                            }))
                          }
                          className={`h-11 rounded overflow-hidden border ${
                            devLayer.screenshotUrl === shot.dataUrl
                              ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <img
                            src={shot.dataUrl}
                            alt={shot.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Shadows & Glare */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Screen Glare</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {Math.round((devLayer.glareIntensity ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={devLayer.glareIntensity ?? 0.35}
                      onChange={(e) =>
                        onUpdateLayer(devLayer.id, (l) => ({
                          ...(l as DeviceLayer),
                          glareIntensity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>

                  <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                    <span>3D Floor Shadow</span>
                    <input
                      type="checkbox"
                      checked={devLayer.contactShadow3D}
                      onChange={(e) =>
                        onUpdateLayer(devLayer.id, (l) => ({
                          ...(l as DeviceLayer),
                          contactShadow3D: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600"
                    />
                  </label>
                </div>
              </>
            );
          })()}

        {/* ============================================================
            2. TEXT LAYER INSPECTOR
           ============================================================ */}
        {layer.type === 'text' &&
          (() => {
            const txtLayer = layer as TextLayer;
            return (
              <>
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      Text Content
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddTextLayer('body')}
                      className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Add New Text
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={txtLayer.text}
                    onChange={(e) =>
                      onUpdateLayer(txtLayer.id, (l) => ({
                        ...(l as TextLayer),
                        text: e.target.value,
                      }))
                    }
                    className="w-full p-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 resize-y"
                  />

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Font Family</span>
                    <select
                      value={txtLayer.fontFamily}
                      onChange={(e) =>
                        onUpdateLayer(txtLayer.id, (l) => ({
                          ...(l as TextLayer),
                          fontFamily: e.target.value,
                        }))
                      }
                      className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <select
                      value={txtLayer.fontWeight}
                      onChange={(e) =>
                        onUpdateLayer(txtLayer.id, (l) => ({
                          ...(l as TextLayer),
                          fontWeight: Number(e.target.value),
                        }))
                      }
                      className="px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                    >
                      <option value={500}>Medium</option>
                      <option value={600}>SemiBold</option>
                      <option value={700}>Bold</option>
                      <option value={800}>ExtraBold</option>
                    </select>

                    <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                      {(
                        [
                          ['left', AlignLeft],
                          ['center', AlignCenter],
                          ['right', AlignRight],
                        ] as const
                      ).map(([al, Icon]) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() =>
                            onUpdateLayer(txtLayer.id, (l) => ({
                              ...(l as TextLayer),
                              align: al,
                            }))
                          }
                          className={`py-1 rounded flex items-center justify-center ${
                            txtLayer.align === al
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Size</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {txtLayer.fontSize}pt
                        </span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={110}
                        value={txtLayer.fontSize}
                        onChange={(e) =>
                          onUpdateLayer(txtLayer.id, (l) => ({
                            ...(l as TextLayer),
                            fontSize: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Line Height</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {txtLayer.lineHeight.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.85}
                        max={1.8}
                        step={0.02}
                        value={txtLayer.lineHeight}
                        onChange={(e) =>
                          onUpdateLayer(txtLayer.id, (l) => ({
                            ...(l as TextLayer),
                            lineHeight: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Text Color
                    </span>
                    <input
                      type="color"
                      value={txtLayer.color}
                      onChange={(e) =>
                        onUpdateLayer(txtLayer.id, (l) => ({
                          ...(l as TextLayer),
                          color: e.target.value,
                        }))
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>

                  <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                    <span>Gradient Fill</span>
                    <input
                      type="checkbox"
                      checked={txtLayer.gradientEnabled}
                      onChange={(e) =>
                        onUpdateLayer(txtLayer.id, (l) => ({
                          ...(l as TextLayer),
                          gradientEnabled: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer">
                    <span>Pill Box Backdrop</span>
                    <input
                      type="checkbox"
                      checked={txtLayer.bgEnabled}
                      onChange={(e) =>
                        onUpdateLayer(txtLayer.id, (l) => ({
                          ...(l as TextLayer),
                          bgEnabled: e.target.checked,
                        }))
                      }
                      className="accent-indigo-600"
                    />
                  </label>
                </div>
              </>
            );
          })()}

        {/* ============================================================
            3. SHAPE / IMAGE / 3D CLAY OBJECT INSPECTOR
           ============================================================ */}
        {layer.type === 'shape' &&
          (() => {
            const shp = layer as ShapeLayer;
            return (
              <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {shp.shapeKind === 'image' ? 'Image / Logo Layer' : 'Shape & 3D Clay Object'}
                </div>

                {shp.shapeKind === 'image' && (
                  <label className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Replace Image File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const url = String(reader.result);
                            onUpdateLayer(shp.id, (l) => ({
                              ...(l as ShapeLayer),
                              imageUrl: url,
                            }));
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {(shp.shapeKind === 'feature-card' ||
                  shp.shapeKind === 'pill' ||
                  shp.shapeKind === 'app-icon' ||
                  shp.shapeKind === 'clay-card' ||
                  shp.shapeKind === 'badge') && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 block">Primary Label</span>
                    <input
                      type="text"
                      value={shp.label || ''}
                      onChange={(e) =>
                        onUpdateLayer(shp.id, (l) => ({
                          ...(l as ShapeLayer),
                          label: e.target.value,
                        }))
                      }
                      className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}

                {shp.shapeKind !== 'image' && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">Fill Color</span>
                    <input
                      type="color"
                      value={shp.fill}
                      onChange={(e) =>
                        onUpdateLayer(shp.id, (l) => ({
                          ...(l as ShapeLayer),
                          fill: e.target.value,
                        }))
                      }
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Width</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{shp.width}</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={960}
                    value={shp.width}
                    onChange={(e) =>
                      onUpdateLayer(shp.id, (l) => ({
                        ...(l as ShapeLayer),
                        width: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Height</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{shp.height}</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={960}
                    value={shp.height}
                    onChange={(e) =>
                      onUpdateLayer(shp.id, (l) => ({
                        ...(l as ShapeLayer),
                        height: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Corner Radius</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {shp.cornerRadius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    value={shp.cornerRadius}
                    onChange={(e) =>
                      onUpdateLayer(shp.id, (l) => ({
                        ...(l as ShapeLayer),
                        cornerRadius: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            );
          })()}

        {/* Shared Opacity Slider */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400">Layer Opacity</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
              {Math.round((layer.opacity ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={layer.opacity ?? 1}
            onChange={(e) =>
              onUpdateLayer(layer.id, (l) => ({
                ...l,
                opacity: Number(e.target.value),
              }))
            }
            className="w-full accent-indigo-600"
          />
        </div>
      </div>
    </aside>
  );
};
