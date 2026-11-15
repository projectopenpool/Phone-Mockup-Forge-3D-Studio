import React, { useMemo, useState } from 'react';
import {
  LayoutGrid,
  Upload,
  Palette,
  Type,
  Smartphone,
  Layers as LayersIcon,
  Sparkles,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Bookmark,
  Search,
  FolderPlus,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Workflow,
  Box,
} from 'lucide-react';
import { DEVICE_LIST } from '../data/devices';
import {
  ALL_100_LAYOUTS,
  CONTINUITY_PACKS,
  FEATURED_GRAPHIC_TEMPLATES,
  TEMPLATE_PACKS,
} from '../data/templates';
import {
  BackgroundConfig,
  BackgroundPattern,
  CanvasLayer,
  ContinuityFlowType,
  DeviceLayer,
  DeviceModelId,
  SavedBackgroundPreset,
  ShapeKind,
  SlideDesign,
  TemplateCategory,
  TemplateLayoutItem,
  TemplatePack,
  TemplateTypeFilter,
  UploadedScreenshot,
  WorkspaceMode,
} from '../types/studio';
import { SlidePreviewCanvas } from './SlidePreviewCanvas';

export type LeftTabId =
  | 'templates'
  | 'uploads'
  | 'background'
  | 'text'
  | 'elements'
  | 'layers';

interface LeftSidebarPanelProps {
  activeTab: LeftTabId;
  onSelectTab: (tab: LeftTabId) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  workspaceMode: WorkspaceMode;
  activeSlide: SlideDesign;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  // Template actions
  onApplyTemplatePackAllSlides: (pack: TemplatePack) => void;
  onApplySingleLayoutToActiveSlide: (layout: TemplateLayoutItem) => void;
  onAddLayoutAsNewSlide: (layout: TemplateLayoutItem) => void;
  onApplyFeaturedTemplate: (slide: SlideDesign) => void;
  onReuseScreenshotElementsInFeatured: () => void;
  // Upload actions
  uploadedScreenshots: UploadedScreenshot[];
  onUploadFiles: (files: FileList) => void;
  onAutoPopulateAllSlides: () => void;
  onAssignScreenshotToDevice: (deviceLayerId: string, screenshotUrl: string) => void;
  onDeleteUploadedScreenshot: (id: string) => void;
  onLoadSampleScreenshots: () => void;
  // Background actions
  onUpdateBackground: (updater: (bg: BackgroundConfig) => BackgroundConfig) => void;
  savedBackgrounds: SavedBackgroundPreset[];
  onSaveCurrentBackground: (name: string) => void;
  onDeleteSavedBackground: (id: string) => void;
  onUploadBackgroundImage: (file: File) => void;
  // Add Element / Text / 3D Device actions
  onAddTextLayer: (preset: 'hero' | 'title' | 'kicker' | 'body' | 'gradient-display' | 'pill-tag') => void;
  onAddDeviceLayer: (deviceId: DeviceModelId, asClay?: boolean) => void;
  onAddShapeLayer: (kind: ShapeKind) => void;
  onUploadStickerImage: (file: File) => void;
  // Layer management actions
  onUpdateLayer: (layerId: string, updater: (l: CanvasLayer) => CanvasLayer) => void;
  onMoveLayerOrder: (layerId: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  onDuplicateLayer: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onGroupSelectedLayers: () => void;
  onUngroupSelectedLayers: () => void;
}

const SOFT_PASTEL_SWATCHES = [
  '#FDF2F8',
  '#F3E8FF',
  '#E0E7FF',
  '#DBEAFE',
  '#ECFDF5',
  '#FEF3C7',
  '#FFEDD5',
  '#FFE4E6',
  '#F1F5F9',
  '#FAF8F5',
];

const SOLID_DARK_SWATCHES = [
  '#090D16',
  '#0F172A',
  '#18181B',
  '#1E1B4B',
  '#022C22',
  '#311042',
  '#172554',
  '#27272A',
  '#450A0A',
  '#FFFFFF',
];

const TEMPLATE_TYPE_OPTIONS: { id: TemplateTypeFilter; label: string }[] = [
  { id: 'all', label: 'All Types' },
  { id: 'continuity', label: 'Continuity Flow' },
  { id: '3d-clay', label: '3D Clay' },
  { id: 'single-device', label: 'Single Device' },
  { id: 'multi-device', label: 'Multi-Device' },
  { id: 'isometric-3d', label: 'Isometric 3D' },
  { id: 'split-bleed', label: 'Split / Bleed' },
  { id: 'minimal-light', label: 'Minimal Light' },
  { id: 'dark-pro', label: 'Dark Pro' },
];

export const LeftSidebarPanel: React.FC<LeftSidebarPanelProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  workspaceMode,
  activeSlide,
  selectedLayerIds,
  onSelectLayers,
  onApplyTemplatePackAllSlides,
  onApplySingleLayoutToActiveSlide,
  onAddLayoutAsNewSlide,
  onApplyFeaturedTemplate,
  onReuseScreenshotElementsInFeatured,
  uploadedScreenshots,
  onUploadFiles,
  onAutoPopulateAllSlides,
  onAssignScreenshotToDevice,
  onDeleteUploadedScreenshot,
  onLoadSampleScreenshots,
  onUpdateBackground,
  savedBackgrounds,
  onSaveCurrentBackground,
  onDeleteSavedBackground,
  onUploadBackgroundImage,
  onAddTextLayer,
  onAddDeviceLayer,
  onAddShapeLayer,
  onUploadStickerImage,
  onUpdateLayer,
  onMoveLayerOrder,
  onDuplicateLayer,
  onDeleteLayer,
  onGroupSelectedLayers,
  onUngroupSelectedLayers,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<TemplateTypeFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateViewMode, setTemplateViewMode] = useState<'packs' | 'layouts'>('packs');
  const [visibleLayoutLimit, setVisibleLayoutLimit] = useState(24);
  const [featuredCategoryFilter, setFeaturedCategoryFilter] = useState<string>('all');
  const [bgPresetName, setBgPresetName] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  const navItems: { id: LeftTabId; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'templates', label: 'Templates', icon: LayoutGrid },
    { id: 'uploads', label: 'Screens', icon: Upload },
    { id: 'elements', label: '3D & Clay', icon: Smartphone },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'background', label: 'Backdrop', icon: Palette },
    { id: 'layers', label: 'Layers', icon: LayersIcon },
  ];

  const isCompositionSpecificFilter =
    selectedTypeFilter === 'multi-device' ||
    selectedTypeFilter === 'isometric-3d' ||
    selectedTypeFilter === 'split-bleed' ||
    selectedTypeFilter === 'single-device';

  const filteredLayouts = useMemo(() => {
    return ALL_100_LAYOUTS.filter((item) => {
      const matchesCat = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesType =
        selectedTypeFilter === 'all' ||
        item.templateType.includes(selectedTypeFilter) ||
        (selectedTypeFilter === '3d-clay' && item.categoryId === '3d-clay') ||
        (selectedTypeFilter === 'continuity' && item.categoryId === 'continuity-flow');
      const matchesQuery =
        !templateSearch.trim() ||
        item.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        item.compositionTag.toLowerCase().includes(templateSearch.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(templateSearch.toLowerCase());
      return matchesCat && matchesType && matchesQuery;
    });
  }, [selectedCategory, selectedTypeFilter, templateSearch]);

  const filteredPacks = useMemo(() => {
    const matching = TEMPLATE_PACKS.filter((pack) => {
      if (selectedCategory !== 'all' && pack.categoryId !== selectedCategory && pack.id !== selectedCategory) {
        return false;
      }
      if (selectedTypeFilter === 'continuity') return Boolean(pack.isContinuityPack);
      if (selectedTypeFilter === '3d-clay') {
        return Boolean(pack.isClayPack) || pack.categoryId === '3d-clay' || pack.id === '3d-clay';
      }
      if (selectedTypeFilter === 'minimal-light') {
        return (
          pack.categoryId === 'minimalist-clean' ||
          pack.categoryId === 'soft-pastel' ||
          ['minimalist-clean', 'soft-pastel', 'productivity-pro', 'continuity-editorial-arch', 'continuity-minimal-grid', 'continuity-golden-arch', 'continuity-nordic-blueprint'].includes(pack.id)
        );
      }
      if (selectedTypeFilter === 'dark-pro') {
        return (
          pack.categoryId === 'premium-dark' ||
          pack.categoryId === 'futuristic-tech' ||
          ['premium-dark', 'futuristic-tech', 'floating-3d', 'continuity-aurora-wave', 'continuity-diagonal-kinetic', 'continuity-cyber-neon', 'continuity-cobalt-velocity'].includes(pack.id)
        );
      }
      if (
        selectedTypeFilter === 'multi-device' ||
        selectedTypeFilter === 'isometric-3d' ||
        selectedTypeFilter === 'split-bleed' ||
        selectedTypeFilter === 'single-device'
      ) {
        return pack.layouts.some((l) => l.templateType.includes(selectedTypeFilter));
      }
      return true;
    });

    // Prioritize dedicated category packs at the top when filtering by composition type
    if (selectedTypeFilter === 'multi-device') {
      return [...matching].sort((a, b) =>
        a.id === 'multi-overlapping' ? -1 : b.id === 'multi-overlapping' ? 1 : 0
      );
    }
    if (selectedTypeFilter === 'isometric-3d') {
      return [...matching].sort((a, b) =>
        a.id === 'floating-3d' ? -1 : b.id === 'floating-3d' ? 1 : 0
      );
    }
    if (selectedTypeFilter === 'split-bleed') {
      return [...matching].sort((a, b) =>
        a.id === 'split-screen' ? -1 : b.id === 'split-screen' ? 1 : 0
      );
    }
    return matching;
  }, [selectedCategory, selectedTypeFilter]);

  const filteredFeaturedTemplates = useMemo(() => {
    if (featuredCategoryFilter === 'all') return FEATURED_GRAPHIC_TEMPLATES;
    return FEATURED_GRAPHIC_TEMPLATES.filter((fg) => fg.categoryLabel === featuredCategoryFilter);
  }, [featuredCategoryFilter]);

  const slideDevices = activeSlide.layers.filter(
    (l): l is DeviceLayer => l.type === 'device'
  );

  const sortedLayersTopDown = [...activeSlide.layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <aside className="flex h-full shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D121D] text-slate-900 dark:text-slate-100 select-none">
      {/* Compact Vertical Icon Rail (56px) */}
      <div className="w-[56px] flex flex-col items-center justify-between py-2.5 border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#090D15]">
        <div className="flex flex-col items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id && !isCollapsed;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (activeTab === item.id && !isCollapsed) {
                    onToggleCollapse();
                  } else {
                    onSelectTab(item.id);
                    if (isCollapsed) onToggleCollapse();
                  }
                }}
                className={`w-11 py-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-semibold whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand Left Panel' : 'Collapse Left Panel for Larger Canvas'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expandable Compact Drawer (262px) */}
      {!isCollapsed && (
        <div className="w-[262px] flex flex-col h-full overflow-hidden">
          {/* =================================================================
              TAB 1: TEMPLATES (By Type, Continuity Packs, 3D Clay, 12 Featured)
             ================================================================= */}
          {activeTab === 'templates' && (
            <div className="flex flex-col h-full">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    {workspaceMode === 'featured-graphic'
                      ? 'Featured Graphics (12)'
                      : 'Template Studio'}
                  </h2>
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {workspaceMode === 'featured-graphic'
                      ? `${filteredFeaturedTemplates.length} templates`
                      : templateViewMode === 'packs' && !isCompositionSpecificFilter
                      ? `${filteredPacks.length} packs`
                      : `${filteredLayouts.length} layouts`}
                  </span>
                </div>

                {workspaceMode === 'featured-graphic' ? (
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    {[
                      { id: 'all', label: 'All (12)' },
                      { id: '3D Clay', label: '3D Clay' },
                      { id: 'Continuity', label: 'Continuity' },
                      { id: 'Dark Pro', label: 'Dark Pro' },
                      { id: 'Minimal Light', label: 'Minimal Light' },
                      { id: 'Multi-Device', label: 'Multi-Phone' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFeaturedCategoryFilter(cat.id)}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          featuredCategoryFilter === cat.id
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* View Switcher: Storyboard Packs vs Individual Layouts */}
                    <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-900 rounded-lg border border-slate-300/60 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTemplateViewMode('packs')}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                          templateViewMode === 'packs'
                            ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Packs & Continuity ({filteredPacks.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateViewMode('layouts')}
                        className={`py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                          templateViewMode === 'layouts'
                            ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Single Layouts ({filteredLayouts.length})
                      </button>
                    </div>

                    {/* View Templates by Type Filter */}
                    <div>
                      <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                        <span>Filter by Template Type</span>
                        {selectedTypeFilter !== 'all' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTypeFilter('all');
                              setSelectedCategory('all');
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {TEMPLATE_TYPE_OPTIONS.map((t) => {
                          const active = selectedTypeFilter === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setSelectedTypeFilter(t.id);
                                setVisibleLayoutLimit(30);
                              }}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                                active
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Search Input */}
                    {(templateViewMode === 'layouts' || isCompositionSpecificFilter) && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={templateSearch}
                          onChange={(e) => {
                            setTemplateSearch(e.target.value);
                            setVisibleLayoutLimit(30);
                          }}
                          placeholder="Search Clay, Continuity, Iso, Split..."
                          className="w-full pl-8 pr-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Scrollable Template List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {workspaceMode === 'featured-graphic' ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={onReuseScreenshotElementsInFeatured}
                      className="w-full py-2 px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Sync Style From Active Screenshot
                    </button>

                    {filteredFeaturedTemplates.map((fg) => (
                      <div
                        key={fg.id}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 transition-colors space-y-1.5"
                      >
                        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                          <SlidePreviewCanvas
                            slide={fg.slide}
                            width={220}
                            height={107}
                            useFastThumbnail={true}
                            className="w-full h-auto block"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                              {fg.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {fg.tagline}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onApplyFeaturedTemplate(fg.slide)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : templateViewMode === 'packs' && !isCompositionSpecificFilter ? (
                  <div className="space-y-3">
                    {filteredPacks.map((pack) => (
                      <div
                        key={pack.id}
                        className={`p-2.5 rounded-xl border space-y-2 transition-colors ${
                          pack.isContinuityPack
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-500/40'
                            : pack.isClayPack
                            ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200 dark:border-amber-500/30'
                            : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              {pack.isContinuityPack && (
                                <Workflow className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              )}
                              {pack.isClayPack && (
                                <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              )}
                              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {pack.name}
                              </h3>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 line-clamp-2">
                              {pack.tagline}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onApplyTemplatePackAllSlides(pack)}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold whitespace-nowrap shrink-0 transition-colors shadow-xs"
                          >
                            Use {pack.layouts.length} Slides
                          </button>
                        </div>

                        {/* Connected panoramic preview strip for Continuity Packs or 5-col grid */}
                        <div
                          className={`grid grid-cols-5 ${
                            pack.isContinuityPack
                              ? 'gap-0 rounded-lg overflow-hidden border border-indigo-300/70 dark:border-indigo-500/40'
                              : 'gap-1'
                          }`}
                        >
                          {pack.layouts.slice(0, 5).map((lyt) => (
                            <button
                              key={lyt.id}
                              type="button"
                              onClick={() => onApplySingleLayoutToActiveSlide(lyt)}
                              title={`Apply ${lyt.compositionTag} to active slide`}
                              className={`group relative overflow-hidden transition-transform hover:z-10 hover:scale-105 ${
                                pack.isContinuityPack
                                  ? 'border-r border-white/15 last:border-r-0'
                                  : 'rounded border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <SlidePreviewCanvas
                                slide={lyt.slide}
                                width={46}
                                height={100}
                                useFastThumbnail={true}
                                className="w-full h-auto block"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* When filtering by Multi-Device, Isometric 3D, Split/Bleed, or Single Device, show Featured Matching Pack at top if applicable */}
                    {isCompositionSpecificFilter && filteredPacks.length > 0 && (
                      <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/40 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              Featured {TEMPLATE_TYPE_OPTIONS.find((o) => o.id === selectedTypeFilter)?.label} Pack
                            </div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {filteredPacks[0].name}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const matchingPackSlides = filteredPacks[0].layouts.filter((l) =>
                                l.templateType.includes(selectedTypeFilter)
                              );
                              onApplyTemplatePackAllSlides({
                                ...filteredPacks[0],
                                layouts:
                                  matchingPackSlides.length >= 3
                                    ? matchingPackSlides
                                    : filteredPacks[0].layouts,
                              });
                            }}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-semibold whitespace-nowrap shrink-0"
                          >
                            Use Pack
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {filteredLayouts.slice(0, visibleLayoutLimit).map((item) => (
                        <div
                          key={item.id}
                          className="group rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 p-1.5 flex flex-col justify-between transition-all"
                        >
                          <div
                            onClick={() => onApplySingleLayoutToActiveSlide(item)}
                            className="relative rounded-lg overflow-hidden bg-slate-950 cursor-pointer"
                          >
                            <SlidePreviewCanvas
                              slide={item.slide}
                              width={106}
                              height={228}
                              useFastThumbnail={true}
                              className="w-full h-auto block"
                            />
                            <div className="absolute inset-0 bg-slate-950/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1.5">
                              <span className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-semibold">
                                Apply Slide
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddLayoutAsNewSlide(item);
                                }}
                                className="px-1.5 py-0.5 rounded bg-white/90 text-slate-900 text-[9px] font-semibold"
                              >
                                + New Slide
                              </button>
                            </div>
                          </div>
                          <div className="mt-1.5 px-0.5">
                            <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                              <span>#{item.globalIndex}</span>
                              <span className="truncate max-w-[75px]">{item.categoryName}</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.compositionTag}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {filteredLayouts.length > visibleLayoutLimit && (
                      <button
                        type="button"
                        onClick={() => setVisibleLayoutLimit((n) => n + 36)}
                        className="w-full py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        Load More Layouts ({filteredLayouts.length - visibleLayoutLimit} remaining)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: SCREENSHOT UPLOADS & AUTO-PLACEMENT
             ================================================================= */}
          {activeTab === 'uploads' && (
            <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  App Screenshots
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload screenshots once and populate all 3D devices cleanly.
                </p>
              </div>

              <label className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 cursor-pointer transition-colors text-center">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Upload App Screenshots
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  PNG, JPG, WebP · Zero distortion
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onUploadFiles(e.target.files);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onAutoPopulateAllSlides}
                  disabled={uploadedScreenshots.length === 0}
                  className="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto-Fill All
                </button>
                <button
                  type="button"
                  onClick={onLoadSampleScreenshots}
                  className="py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <ImageIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  Sample Screens
                </button>
              </div>

              {uploadedScreenshots.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    All 3D phones currently render crisp procedural app UI screens. Upload your own or load samples:
                  </p>
                  <button
                    type="button"
                    onClick={onLoadSampleScreenshots}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold"
                  >
                    Generate 5 Sample Screens
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {uploadedScreenshots.map((shot) => (
                    <div
                      key={shot.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', shot.dataUrl);
                      }}
                      className="group relative rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 space-y-1.5"
                    >
                      <div className="relative h-28 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                        <img
                          src={shot.dataUrl}
                          alt={shot.name}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => onDeleteUploadedScreenshot(shot.id)}
                          className="absolute top-1 right-1 p-1 rounded bg-slate-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {shot.name}
                      </div>
                      {slideDevices.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {slideDevices.map((dev, idx) => (
                            <button
                              key={dev.id}
                              type="button"
                              onClick={() => onAssignScreenshotToDevice(dev.id, shot.dataUrl)}
                              className="flex-1 py-0.5 px-1 rounded bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-[9px] font-semibold transition-colors truncate"
                            >
                              Phone #{idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: 3D DEVICES, 3D CLAY & DECORATIVE ELEMENTS
             ================================================================= */}
          {activeTab === 'elements' && (
            <div className="flex flex-col h-full p-3 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Add 3D Clay or Metal Device
                </h2>
                <button
                  type="button"
                  onClick={() => onAddDeviceLayer('iphone-17-pro-max', true)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Box className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  + Add 3D Matte Clay iPhone 17 Pro
                </button>

                <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 pt-1">
                  Apple iPhone 17 & 16 Series
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEVICE_LIST.filter((d) => d.platform === 'apple').map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => onAddDeviceLayer(dev.id, false)}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                        {dev.shortName}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">
                        {dev.displayDiagonal} · 3D
                      </div>
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-1">
                  Android Flagships (S26 & Pixel 10)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEVICE_LIST.filter((d) => d.platform === 'android').map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => onAddDeviceLayer(dev.id, false)}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                    >
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">
                        {dev.shortName}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400">
                        {dev.displayDiagonal} · 3D
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  3D Clay Objects & Badges
                </h2>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['clay-sphere', '3D Clay Sphere'],
                      ['clay-card', '3D Clay Card'],
                      ['feature-card', 'KPI Callout Card'],
                      ['pill', 'Store Rating Pill'],
                      ['app-icon', 'App Icon Badge'],
                      ['glow-orb', 'Ambient 3D Glow'],
                      ['rect', 'Glass Card'],
                      ['star', 'Rating Star'],
                    ] as [ShapeKind, string][]
                  ).map(([kind, label]) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => onAddShapeLayer(kind)}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>

                <label className="w-full py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Upload Custom Logo / Sticker
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
            </div>
          )}

          {/* =================================================================
              TAB 4: TYPOGRAPHY & TEXT PRESETS
             ================================================================= */}
          {activeTab === 'text' && (
            <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Typography Layers
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Click to add editable headlines, kickers, or body text.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onAddTextLayer('hero')}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                >
                  <div className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Display Headline
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Plus Jakarta Sans · 50pt ExtraBold
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onAddTextLayer('title')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                >
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Section Subheading
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Outfit · 36pt Bold
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onAddTextLayer('body')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                >
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Supporting Body Copy
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    DM Sans · 22pt Medium
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onAddTextLayer('pill-tag')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                >
                  <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                    01 · FEATURE KICKER
                  </span>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Pill Callout Kicker
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onAddTextLayer('gradient-display')}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left transition-colors"
                >
                  <div className="text-sm font-extrabold bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
                    Aurora Gradient Headline
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Multi-stop gradient fill
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 5: BACKGROUND STUDIO (3D Clay Backdrop & Continuity Flow)
             ================================================================= */}
          {activeTab === 'background' && (
            <div className="flex flex-col h-full p-3 space-y-3.5 overflow-y-auto">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Background & Continuity
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  3D Clay studio backdrops, continuous multi-slide waves, or custom gradients.
                </p>
              </div>

              {/* Background Type Selector */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                {(
                  [
                    ['3d-clay-backdrop', '3D Clay'],
                    ['solid', 'Solid'],
                    ['linear-gradient', 'Linear'],
                    ['radial-gradient', 'Radial'],
                    ['mesh-gradient', 'Aurora'],
                    ['image', 'Image'],
                  ] as [BackgroundConfig['type'], string][]
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onUpdateBackground((bg) => ({ ...bg, type }))}
                    className={`py-1 text-[10px] font-semibold rounded transition-colors ${
                      activeSlide.background.type === type
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Multi-Slide Continuity Flow Selector */}
              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1">
                    <Workflow className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Continuous Flow Wave
                  </span>
                </div>
                <select
                  value={activeSlide.background.continuityType || 'none'}
                  onChange={(e) => {
                    const flow = e.target.value as ContinuityFlowType;
                    onUpdateBackground((bg) => ({
                      ...bg,
                      continuityType: flow,
                      continuityAccent: bg.continuityAccent || '#6366F1',
                      continuitySecondary: bg.continuitySecondary || '#22D3EE',
                    }));
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="none">None (Independent Slide)</option>
                  <option value="aurora-wave">Continuous Aurora Ribbon Wave</option>
                  <option value="clay-hills">Continuous 3D Clay Horizon Hills</option>
                  <option value="archway">Continuous Architectural Arches</option>
                  <option value="diagonal-stripe">Continuous Kinetic Speed Bands</option>
                  <option value="blueprint-line">Continuous Isometric Blueprint Wave</option>
                </select>

                {activeSlide.background.continuityType &&
                  activeSlide.background.continuityType !== 'none' && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                        <span>Wave Color 1</span>
                        <input
                          type="color"
                          value={activeSlide.background.continuityAccent || '#6366F1'}
                          onChange={(e) =>
                            onUpdateBackground((bg) => ({
                              ...bg,
                              continuityAccent: e.target.value,
                            }))
                          }
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-300">
                        <span>Wave Color 2</span>
                        <input
                          type="color"
                          value={activeSlide.background.continuitySecondary || '#22D3EE'}
                          onChange={(e) =>
                            onUpdateBackground((bg) => ({
                              ...bg,
                              continuitySecondary: e.target.value,
                            }))
                          }
                          className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </div>
                    </div>
                  )}
              </div>

              {/* Solid or 3D Clay Color Controls */}
              {(activeSlide.background.type === 'solid' ||
                activeSlide.background.type === '3d-clay-backdrop') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      Base Color
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={activeSlide.background.solidColor}
                        onChange={(e) =>
                          onUpdateBackground((bg) => ({ ...bg, solidColor: e.target.value }))
                        }
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={activeSlide.background.solidColor}
                        onChange={(e) =>
                          onUpdateBackground((bg) => ({ ...bg, solidColor: e.target.value }))
                        }
                        className="w-20 px-2 py-1 text-[11px] font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Soft Clay & Pastel Studio Swatches
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SOFT_PASTEL_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            onUpdateBackground((bg) => ({ ...bg, solidColor: hex }))
                          }
                          className="h-6 rounded-md border border-slate-300 dark:border-white/20 transition-transform hover:scale-105"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Deep Studio Swatches
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SOLID_DARK_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            onUpdateBackground((bg) => ({ ...bg, solidColor: hex }))
                          }
                          className="h-6 rounded-md border border-slate-300 dark:border-white/20 transition-transform hover:scale-105"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Gradient Controls */}
              {(activeSlide.background.type === 'linear-gradient' ||
                activeSlide.background.type === 'radial-gradient' ||
                activeSlide.background.type === 'mesh-gradient' ||
                activeSlide.background.type === '3d-clay-backdrop') && (
                <div className="space-y-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  {activeSlide.background.type === 'linear-gradient' && (
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Gradient Angle</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                          {activeSlide.background.gradientAngle}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={activeSlide.background.gradientAngle}
                        onChange={(e) =>
                          onUpdateBackground((bg) => ({
                            ...bg,
                            gradientAngle: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Color Stops
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBackground((bg) => ({
                            ...bg,
                            gradientStops: [
                              ...bg.gradientStops,
                              { id: `st_${Date.now()}`, color: '#38BDF8', position: 100 },
                            ],
                          }))
                        }
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold"
                      >
                        + Stop
                      </button>
                    </div>

                    {activeSlide.background.gradientStops.map((stop, idx) => (
                      <div key={stop.id} className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => {
                            const val = e.target.value;
                            onUpdateBackground((bg) => ({
                              ...bg,
                              gradientStops: bg.gradientStops.map((s, i) =>
                                i === idx ? { ...s, color: val } : s
                              ),
                            }));
                          }}
                          className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={stop.position}
                          onChange={(e) => {
                            const pos = Number(e.target.value);
                            onUpdateBackground((bg) => ({
                              ...bg,
                              gradientStops: bg.gradientStops.map((s, i) =>
                                i === idx ? { ...s, position: pos } : s
                              ),
                            }));
                          }}
                          className="flex-1 accent-indigo-600"
                        />
                        <span className="text-[10px] font-mono text-slate-500 w-7 text-right tabular-nums">
                          {stop.position}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Upload */}
              {activeSlide.background.type === 'image' && (
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                  <label className="w-full py-2 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Backdrop Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          onUploadBackgroundImage(file);
                          e.target.value = '';
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Subtle Pattern Overlay */}
              <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  Texture & Grid Overlay
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      ['none', 'None'],
                      ['dots', 'Dots'],
                      ['grid', 'Grid'],
                      ['iso-grid', 'Iso'],
                      ['waves', 'Waves'],
                      ['diagonal', 'Lines'],
                    ] as [BackgroundPattern, string][]
                  ).map(([pat, label]) => (
                    <button
                      key={pat}
                      type="button"
                      onClick={() => onUpdateBackground((bg) => ({ ...bg, pattern: pat }))}
                      className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                        activeSlide.background.pattern === pat
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save & Reuse Custom Backgrounds */}
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Saved Backdrops</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={bgPresetName}
                    onChange={(e) => setBgPresetName(e.target.value)}
                    placeholder="Preset name..."
                    className="flex-1 px-2 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const name = bgPresetName.trim() || `Backdrop #${savedBackgrounds.length + 1}`;
                      onSaveCurrentBackground(name);
                      setBgPresetName('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                  >
                    Save
                  </button>
                </div>

                {savedBackgrounds.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBackground(() => JSON.parse(JSON.stringify(item.config)))
                      }
                      className="flex items-center gap-2 text-left flex-1 truncate font-medium text-slate-700 dark:text-slate-200"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0"
                        style={{
                          backgroundColor:
                            item.config.type === 'solid'
                              ? item.config.solidColor
                              : item.config.gradientStops[0]?.color || '#4F46E5',
                        }}
                      />
                      <span className="truncate">{item.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedBackground(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 6: LAYER MANAGEMENT
             ================================================================= */}
          {activeTab === 'layers' && (
            <div className="flex flex-col h-full p-3 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Layer Stack
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeSlide.layers.length} independent layers
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onGroupSelectedLayers}
                    disabled={selectedLayerIds.length < 2}
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-[10px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                  >
                    <FolderPlus className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                    Group
                  </button>
                  <button
                    type="button"
                    onClick={onUngroupSelectedLayers}
                    disabled={selectedLayerIds.length === 0}
                    className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-[10px] font-semibold text-slate-700 dark:text-slate-200"
                  >
                    Ungroup
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {sortedLayersTopDown.map((layer) => {
                  const isSelected = selectedLayerIds.includes(layer.id);
                  return (
                    <div
                      key={layer.id}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          if (isSelected) {
                            onSelectLayers(selectedLayerIds.filter((id) => id !== layer.id));
                          } else {
                            onSelectLayers([...selectedLayerIds, layer.id]);
                          }
                        } else {
                          onSelectLayers([layer.id]);
                        }
                      }}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500'
                          : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          {layer.type === 'device' && (
                            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                          {layer.type === 'text' && (
                            <Type className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                          {layer.type === 'shape' && (
                            <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                          )}

                          {editingLayerId === layer.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={layer.name}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                onUpdateLayer(layer.id, (l) => ({ ...l, name: e.target.value }))
                              }
                              onBlur={() => setEditingLayerId(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEditingLayerId(null);
                              }}
                              className="w-full px-1.5 py-0.5 text-xs bg-white dark:bg-slate-950 border border-indigo-500 rounded text-slate-900 dark:text-white"
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerId(layer.id);
                              }}
                              className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                            >
                              {layer.name}
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-0.5 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onMoveLayerOrder(layer.id, 'up')}
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveLayerOrder(layer.id, 'down')}
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLayer(layer.id, (l) => ({ ...l, locked: !l.locked }))
                            }
                            className={`p-1 rounded ${
                              layer.locked
                                ? 'text-amber-500'
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {layer.locked ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateLayer(layer.id, (l) => ({ ...l, visible: !l.visible }))
                            }
                            className={`p-1 rounded ${
                              !layer.visible
                                ? 'text-rose-500'
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            {layer.visible ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDuplicateLayer(layer.id)}
                            className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLayer(layer.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
