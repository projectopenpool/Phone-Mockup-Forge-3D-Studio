import React, { useMemo, useState } from 'react';
import {
  Download,
  Archive,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  X,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { DEVICE_SPECS, EXPORT_PRESETS } from '../data/devices';
import {
  adaptSlideForBatchTarget,
  BatchGeneratedItem,
  exportBatchToZip,
} from '../engine/BatchAdapter';
import { exportSlideAtExactResolution } from '../engine/CompositionRenderer';
import {
  DeviceModelId,
  ExportPreset,
  SlideDesign,
} from '../types/studio';
import { SlidePreviewCanvas } from './SlidePreviewCanvas';

interface BatchAndExportModalProps {
  isOpen: boolean;
  initialMode: 'export' | 'batch';
  onClose: () => void;
  slides: SlideDesign[];
  activeSlideIndex: number;
  featuredGraphicSlide: SlideDesign;
  activePreset: ExportPreset;
  onSelectPreset: (preset: ExportPreset) => void;
  onCustomizeBatchVersion: (adaptedSlide: SlideDesign, preset: ExportPreset) => void;
}

export const BatchAndExportModal: React.FC<BatchAndExportModalProps> = ({
  isOpen,
  initialMode,
  onClose,
  slides,
  activeSlideIndex,
  featuredGraphicSlide,
  activePreset,
  onSelectPreset,
  onCustomizeBatchVersion,
}) => {
  const [tab, setTab] = useState<'export' | 'batch'>(initialMode);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [jpegQuality, setJpegQuality] = useState(0.95);
  const [customWidth, setCustomWidth] = useState(activePreset.width);
  const [customHeight, setCustomHeight] = useState(activePreset.height);
  const [useCustomRes, setUseCustomRes] = useState(false);
  const [includeFeaturedInZip, setIncludeFeaturedInZip] = useState(true);

  const [selectedBatchTargets, setSelectedBatchTargets] = useState<
    { presetId: string; deviceId: DeviceModelId }[]
  >([
    { presetId: 'ios-69', deviceId: 'iphone-17-pro-max' },
    { presetId: 'ios-63', deviceId: 'iphone-17-pro' },
    { presetId: 'play-qhd', deviceId: 'galaxy-s26-ultra' },
    { presetId: 'play-tall', deviceId: 'pixel-10-pro-xl' },
  ]);

  const [customizedBatchSlides] = useState<Record<string, SlideDesign>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  const exportWidth = useCustomRes ? customWidth : activePreset.width;
  const exportHeight = useCustomRes ? customHeight : activePreset.height;

  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    const aspect = exportWidth / exportHeight;

    if (activePreset.store === 'apple') {
      const validAppleSizes = [
        '1320x2868',
        '2868x1320',
        '1290x2796',
        '2796x1290',
        '1242x2688',
        '2688x1242',
        '1206x2622',
        '1179x2556',
      ];
      const key = `${exportWidth}x${exportHeight}`;
      if (!validAppleSizes.includes(key)) {
        warnings.push(
          `Apple App Store Connect strictly requires exact pixel dimensions (e.g. 1320×2868 for 6.9" or 1290×2796 for 6.7"). Custom dimension ${exportWidth}×${exportHeight} may be rejected.`
        );
      }
    } else if (activePreset.store === 'google-play') {
      if (exportWidth < 320 || exportHeight < 320) {
        warnings.push('Google Play Store requires minimum dimension >= 320px.');
      }
      if (exportWidth > 3840 || exportHeight > 3840) {
        warnings.push('Google Play Store requires maximum dimension <= 3840px.');
      }
      if (exportHeight > exportWidth * 2.05 || exportWidth > exportHeight * 2.05) {
        warnings.push(
          'Google Play Store requires the maximum dimension to be no more than twice the minimum dimension.'
        );
      }
      if (Math.abs(aspect - 9 / 16) > 0.08) {
        warnings.push(
          'For Google Play Store phone promotions, 9:16 (1080×1920 or 1440×2560) is recommended.'
        );
      }
    } else if (activePreset.store === 'featured') {
      if (exportWidth !== 1024 || exportHeight !== 500) {
        warnings.push(
          `Google Play Featured Graphic must be exactly 1024 × 500 pixels (currently ${exportWidth} × ${exportHeight}).`
        );
      }
    }
    return warnings;
  }, [activePreset.store, exportWidth, exportHeight]);

  const batchItems: BatchGeneratedItem[] = useMemo(() => {
    const list: BatchGeneratedItem[] = [];
    for (const target of selectedBatchTargets) {
      const preset = EXPORT_PRESETS.find((p) => p.id === target.presetId) || EXPORT_PRESETS[0];
      slides.forEach((s, idx) => {
        const itemId = `${target.presetId}_${target.deviceId}_${s.id}`;
        const adapted =
          customizedBatchSlides[itemId] ||
          adaptSlideForBatchTarget(s, target.deviceId, preset);
        list.push({
          id: itemId,
          preset,
          deviceId: target.deviceId,
          slideIndex: idx,
          slide: adapted,
          isCustomized: Boolean(customizedBatchSlides[itemId]),
        });
      });
    }
    return list;
  }, [selectedBatchTargets, slides, customizedBatchSlides]);

  if (!isOpen) return null;

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  const handleExportSingleSlide = async () => {
    try {
      setIsExporting(true);
      const slideToRender =
        activePreset.store === 'featured'
          ? featuredGraphicSlide
          : slides[activeSlideIndex] || slides[0];
      setProgressText(
        `Rendering High-Res ${exportWidth}×${exportHeight} via Dedicated Offscreen Pipeline...`
      );
      setProgressPct(45);
      await new Promise((r) => setTimeout(r, 30));
      const blob = await exportSlideAtExactResolution(
        slideToRender,
        exportWidth,
        exportHeight,
        format,
        jpegQuality
      );
      setProgressPct(100);
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      triggerDownload(
        blob,
        `MockupForge_${slideToRender.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${exportWidth}x${exportHeight}.${ext}`
      );
    } finally {
      setIsExporting(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  const handleExportFeaturedGraphicOnly = async () => {
    try {
      setIsExporting(true);
      setProgressText('Rendering Google Play Featured Graphic (1024×500)...');
      setProgressPct(50);
      await new Promise((r) => setTimeout(r, 30));
      const blob = await exportSlideAtExactResolution(
        featuredGraphicSlide,
        1024,
        500,
        format,
        jpegQuality
      );
      setProgressPct(100);
      const ext = format === 'jpeg' ? 'jpg' : 'png';
      triggerDownload(blob, `Google_Play_Featured_Graphic_1024x500.${ext}`);
    } finally {
      setIsExporting(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  const handleExportAllCurrentSlidesZip = async () => {
    try {
      setIsExporting(true);
      const defaultDev = activePreset.recommendedDeviceId;
      const singleTargetItems: BatchGeneratedItem[] = slides.map((s, idx) => ({
        id: `cur_${idx}`,
        preset: { ...activePreset, width: exportWidth, height: exportHeight },
        deviceId:
          (s.layers.find((l) => l.type === 'device') as { deviceId?: DeviceModelId } | undefined)
            ?.deviceId || defaultDev,
        slideIndex: idx,
        slide: s,
        isCustomized: false,
      }));

      const zipBlob = await exportBatchToZip(
        singleTargetItems,
        format,
        jpegQuality,
        includeFeaturedInZip ? featuredGraphicSlide : undefined,
        (done, total, label) => {
          setProgressText(label);
          setProgressPct(Math.round((done / Math.max(1, total)) * 100));
        }
      );

      triggerDownload(
        zipBlob,
        `MockupForge_Screenshots_${exportWidth}x${exportHeight}.zip`
      );
    } finally {
      setIsExporting(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  const handleExportFullBatchZip = async () => {
    try {
      setIsExporting(true);
      const zipBlob = await exportBatchToZip(
        batchItems,
        format,
        jpegQuality,
        includeFeaturedInZip ? featuredGraphicSlide : undefined,
        (done, total, label) => {
          setProgressText(label);
          setProgressPct(Math.round((done / Math.max(1, total)) * 100));
        }
      );
      triggerDownload(
        zipBlob,
        `MockupForge_MultiDevice_Batch_${batchItems.length}_Screenshots.zip`
      );
    } finally {
      setIsExporting(false);
      setProgressText('');
      setProgressPct(0);
    }
  };

  const toggleBatchTarget = (presetId: string, deviceId: DeviceModelId) => {
    const exists = selectedBatchTargets.some(
      (t) => t.presetId === presetId && t.deviceId === deviceId
    );
    if (exists) {
      if (selectedBatchTargets.length > 1) {
        setSelectedBatchTargets(
          selectedBatchTargets.filter(
            (t) => !(t.presetId === presetId && t.deviceId === deviceId)
          )
        );
      }
    } else {
      setSelectedBatchTargets([...selectedBatchTargets, { presetId, deviceId }]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              High-Resolution Export & Multi-Device Batch Studio
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTab('export')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'export'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Store Presets & Direct Export
              </button>
              <button
                type="button"
                onClick={() => setTab('batch')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'batch'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Multi-Device Batch ({batchItems.length} outputs)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Export Progress Banner */}
        {isExporting && (
          <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-950/80 border-b border-indigo-200 dark:border-indigo-500/40 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-200 font-semibold">
              <span>{progressText}</span>
              <span className="font-mono tabular-nums">{progressPct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-indigo-100 dark:bg-slate-900 overflow-hidden">
              <div
                className="h-full bg-indigo-600 transition-all duration-150"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* TAB 1: DIRECT HIGH-RESOLUTION EXPORT & VALIDATION */}
        {tab === 'export' && (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                1. Official App Store or Google Play Resolution Preset
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {EXPORT_PRESETS.map((preset) => {
                  const selected = !useCustomRes && activePreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setUseCustomRes(false);
                        onSelectPreset(preset);
                        setCustomWidth(preset.width);
                        setCustomHeight(preset.height);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-indigo-50/80 dark:bg-indigo-600/20 border-indigo-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                        <span>
                          {preset.store === 'apple'
                            ? 'APPLE APP STORE'
                            : preset.store === 'google-play'
                            ? 'GOOGLE PLAY STORE'
                            : 'FEATURED GRAPHIC'}
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                          {preset.width} × {preset.height}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {preset.deviceLabel} · Aspect {preset.aspectLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Resolution Override */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <span>Use Custom Output Resolution</span>
                  <input
                    type="checkbox"
                    checked={useCustomRes}
                    onChange={(e) => setUseCustomRes(e.target.checked)}
                    className="accent-indigo-600"
                  />
                </label>
                {useCustomRes && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Width (px)</span>
                      <input
                        type="number"
                        min={320}
                        max={4320}
                        value={customWidth}
                        onChange={(e) => setCustomWidth(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-1">Height (px)</span>
                      <input
                        type="number"
                        min={320}
                        max={4320}
                        value={customHeight}
                        onChange={(e) => setCustomHeight(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                  2. Format & Compliance
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormat('png')}
                    className={`py-2 rounded-md text-xs font-semibold transition-colors ${
                      format === 'png'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Lossless PNG (24-bit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('jpeg')}
                    className={`py-2 rounded-md text-xs font-semibold transition-colors ${
                      format === 'jpeg'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    High-Quality JPEG
                  </button>
                </div>

                {format === 'jpeg' && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">JPEG Quality</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                        {Math.round(jpegQuality * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={1.0}
                      step={0.01}
                      value={jpegQuality}
                      onChange={(e) => setJpegQuality(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                )}

                {validationWarnings.length === 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                      <strong>Store Compliance Verified:</strong> {exportWidth} × {exportHeight}px{' '}
                      {format.toUpperCase()} meets official {activePreset.name} publishing specs.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Store Dimension Warning</span>
                    </div>
                    {validationWarnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-amber-700 dark:text-amber-200/90 leading-relaxed">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <span>Include 1024×500 Featured Graphic in ZIP</span>
                  <input
                    type="checkbox"
                    checked={includeFeaturedInZip}
                    onChange={(e) => setIncludeFeaturedInZip(e.target.checked)}
                    className="accent-indigo-600"
                  />
                </label>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportSingleSlide}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Active Slide ({exportWidth} × {exportHeight}px)
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportAllCurrentSlidesZip}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Export All {slides.length} Storyboard Slides (.ZIP)
                  </button>

                  <button
                    type="button"
                    disabled={isExporting}
                    onClick={handleExportFeaturedGraphicOnly}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Export Google Play Featured Graphic (1024 × 500px)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-DEVICE BATCH GENERATOR */}
        {tab === 'batch' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Select Target Devices & Store Sizes for Automatic Batch Adaptation</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Each version adapts 3D phone models, screen proportions, and typography hierarchy cleanly.
                </p>
              </div>

              <button
                type="button"
                disabled={isExporting || batchItems.length === 0}
                onClick={handleExportFullBatchZip}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors shrink-0"
              >
                <Archive className="w-4 h-4" />
                Export Entire Batch ({batchItems.length} Screenshots) as ZIP
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 flex items-center gap-2 overflow-x-auto">
              {[
                { presetId: 'ios-69', deviceId: 'iphone-17-pro-max' as DeviceModelId, label: 'iPhone 17 Pro Max (6.9")' },
                { presetId: 'ios-63', deviceId: 'iphone-17-pro' as DeviceModelId, label: 'iPhone 17 Pro (6.3")' },
                { presetId: 'ios-61', deviceId: 'iphone-17' as DeviceModelId, label: 'iPhone 17 (6.1")' },
                { presetId: 'ios-67', deviceId: 'iphone-16-pro-max' as DeviceModelId, label: 'iPhone 16 Pro Max (6.7")' },
                { presetId: 'play-qhd', deviceId: 'galaxy-s26-ultra' as DeviceModelId, label: 'Galaxy S26 Ultra (QHD)' },
                { presetId: 'play-fhd', deviceId: 'galaxy-s26-plus' as DeviceModelId, label: 'Galaxy S26+ (FHD)' },
                { presetId: 'play-tall', deviceId: 'pixel-10-pro-xl' as DeviceModelId, label: 'Pixel 10 Pro XL' },
                { presetId: 'play-fhd', deviceId: 'pixel-10-pro' as DeviceModelId, label: 'Pixel 10 Pro' },
              ].map((item) => {
                const active = selectedBatchTargets.some(
                  (t) => t.presetId === item.presetId && t.deviceId === item.deviceId
                );
                return (
                  <button
                    key={`${item.presetId}_${item.deviceId}`}
                    type="button"
                    onClick={() => toggleBatchTarget(item.presetId, item.deviceId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {batchItems.map((item) => {
                  const spec = DEVICE_SPECS[item.deviceId];
                  const thumbW = 140;
                  const thumbH = Math.round(thumbW * (item.preset.height / item.preset.width));
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 flex flex-col justify-between space-y-2 hover:border-indigo-500 transition-colors"
                    >
                      <div className="rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                        <SlidePreviewCanvas
                          slide={item.slide}
                          width={thumbW}
                          height={thumbH}
                          useFastThumbnail={true}
                          className="w-full h-auto block"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          <span>{spec.shortName}</span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {item.preset.width}×{item.preset.height}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          Slide {item.slideIndex + 1}: {item.slide.name}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onCustomizeBatchVersion(item.slide, item.preset);
                            onClose();
                          }}
                          className="w-full mt-1 py-1.5 px-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-indigo-600 text-slate-800 dark:text-slate-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Sliders className="w-3 h-3" />
                          Edit Version
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
