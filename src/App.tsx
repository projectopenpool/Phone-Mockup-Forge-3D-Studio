import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Smartphone,
  Plus,
  Copy,
  Trash2,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Sun,
  Moon,
  Workflow,
  Columns,
  Type,
  Image as ImageIcon,
} from 'lucide-react';
import { BatchAndExportModal } from './components/BatchAndExportModal';
import { InteractiveDesignCanvas } from './components/InteractiveDesignCanvas';
import { LeftSidebarPanel, LeftTabId } from './components/LeftSidebarPanel';
import { ProjectsModal } from './components/ProjectsModal';
import { RightPropertiesPanel } from './components/RightPropertiesPanel';
import { SlidePreviewCanvas } from './components/SlidePreviewCanvas';
import { DEVICE_LIST, DEVICE_SPECS, EXPORT_PRESETS } from './data/devices';
import {
  CONTINUITY_PACKS,
  FEATURED_GRAPHIC_TEMPLATES,
  TEMPLATE_PACKS,
} from './data/templates';
import { getDemoScreenCanvas } from './engine/DemoScreenGenerator';
import { threeDeviceEngine } from './engine/ThreeDeviceRenderer';
import {
  CanvasLayer,
  DeviceLayer,
  DeviceModelId,
  ExportPreset,
  SavedBackgroundPreset,
  ShapeKind,
  ShapeLayer,
  SlideDesign,
  StudioProject,
  TemplateLayoutItem,
  TemplatePack,
  TextLayer,
  UploadedScreenshot,
  WorkspaceMode,
} from './types/studio';

const STORAGE_KEY = 'mockupforge_3d_studio_projects_v3';

function createInitialProject(name = 'PulsePay 3D App Store Campaign'): StudioProject {
  // Default to Architectural Arch Continuity pack (clean light studio with realistic 3D Titanium phones)
  const defaultPack = CONTINUITY_PACKS[2] || CONTINUITY_PACKS[0] || TEMPLATE_PACKS[0];
  const initialSlides: SlideDesign[] = defaultPack.layouts.map((item) =>
    JSON.parse(JSON.stringify(item.slide))
  );
  const initialFeatured: SlideDesign = JSON.parse(
    JSON.stringify(FEATURED_GRAPHIC_TEMPLATES[0].slide)
  );

  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    updatedAt: Date.now(),
    activePresetId: 'ios-69',
    slides: initialSlides,
    featuredGraphicSlide: initialFeatured,
    uploadedScreenshots: [],
    savedBackgrounds: [
      {
        id: 'bg_saved_1',
        name: '3D Clay Continuity Horizon',
        config: JSON.parse(JSON.stringify(initialSlides[0].background)),
      },
    ],
  };
}

export default function App() {
  // Light Mode by default as requested
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Load persisted projects from localStorage
  const [projects, setProjects] = useState<StudioProject[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to default project
    }
    return [createInitialProject()];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0].id);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0],
    [projects, activeProjectId]
  );

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('screenshots');
  const [leftTab, setLeftTab] = useState<LeftTabId>('templates');
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [isPanoramaMode, setIsPanoramaMode] = useState<boolean>(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(0.95);

  // Modals
  const [exportModalState, setExportModalState] = useState<{
    open: boolean;
    mode: 'export' | 'batch';
  }>({ open: false, mode: 'export' });
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);

  // Undo / Redo History stack for active project
  const [historyPast, setHistoryPast] = useState<StudioProject[]>([]);
  const [historyFuture, setHistoryFuture] = useState<StudioProject[]>([]);
  const clipboardLayerRef = useRef<CanvasLayer | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // Ignore quota errors if large images uploaded
    }
  }, [projects]);

  useEffect(() => {
    activeProject.uploadedScreenshots.forEach((s) => {
      threeDeviceEngine.preloadImage(s.dataUrl).catch(() => {});
    });
  }, [activeProject.uploadedScreenshots]);

  const updateActiveProject = useCallback(
    (updater: (prev: StudioProject) => StudioProject, recordUndo = true) => {
      setProjects((prevList) =>
        prevList.map((proj) => {
          if (proj.id !== activeProject.id) return proj;
          if (recordUndo) {
            setHistoryPast((h) => [...h.slice(-24), JSON.parse(JSON.stringify(proj))]);
            setHistoryFuture([]);
          }
          const updated = updater(proj);
          return { ...updated, updatedAt: Date.now() };
        })
      );
    },
    [activeProject.id]
  );

  const commitHistorySnapshot = useCallback(() => {
    setHistoryPast((h) => [...h.slice(-24), JSON.parse(JSON.stringify(activeProject))]);
    setHistoryFuture([]);
  }, [activeProject]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((h) => h.slice(0, -1));
    setHistoryFuture((f) => [JSON.parse(JSON.stringify(activeProject)), ...f.slice(0, 24)]);
    setProjects((list) => list.map((p) => (p.id === activeProject.id ? previous : p)));
  }, [historyPast, activeProject]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((f) => f.slice(1));
    setHistoryPast((h) => [...h.slice(-24), JSON.parse(JSON.stringify(activeProject))]);
    setProjects((list) => list.map((p) => (p.id === activeProject.id ? next : p)));
  }, [historyFuture, activeProject]);

  const safeSlideIdx = Math.min(
    Math.max(0, activeSlideIndex),
    Math.max(0, activeProject.slides.length - 1)
  );
  const activeSlide: SlideDesign =
    workspaceMode === 'featured-graphic'
      ? activeProject.featuredGraphicSlide
      : activeProject.slides[safeSlideIdx] || activeProject.slides[0];

  const activePreset: ExportPreset = useMemo(() => {
    if (workspaceMode === 'featured-graphic') {
      return EXPORT_PRESETS.find((p) => p.id === 'play-featured')!;
    }
    return (
      EXPORT_PRESETS.find((p) => p.id === activeProject.activePresetId) || EXPORT_PRESETS[0]
    );
  }, [workspaceMode, activeProject.activePresetId]);

  const updateActiveSlide = useCallback(
    (updater: (slide: SlideDesign) => SlideDesign, recordUndo = true) => {
      updateActiveProject((proj) => {
        if (workspaceMode === 'featured-graphic') {
          return {
            ...proj,
            featuredGraphicSlide: updater(proj.featuredGraphicSlide),
          };
        }
        const nextSlides = proj.slides.map((s, idx) =>
          idx === safeSlideIdx ? updater(s) : s
        );
        return { ...proj, slides: nextSlides };
      }, recordUndo);
    },
    [updateActiveProject, workspaceMode, safeSlideIdx]
  );

  const handleUpdateLayer = useCallback(
    (
      layerId: string,
      updater: (layer: CanvasLayer) => CanvasLayer,
      recordUndo = true
    ) => {
      updateActiveSlide((slide) => {
        const target = slide.layers.find((l) => l.id === layerId);
        if (!target) return slide;
        const updatedTarget = updater(target);

        if (
          target.groupId &&
          (updatedTarget.x !== target.x || updatedTarget.y !== target.y)
        ) {
          const dx = updatedTarget.x - target.x;
          const dy = updatedTarget.y - target.y;
          return {
            ...slide,
            layers: slide.layers.map((l) => {
              if (l.id === layerId) return updatedTarget;
              if (l.groupId === target.groupId && !l.locked) {
                return { ...l, x: l.x + dx, y: l.y + dy };
              }
              return l;
            }),
          };
        }

        return {
          ...slide,
          layers: slide.layers.map((l) => (l.id === layerId ? updatedTarget : l)),
        };
      }, recordUndo);
    },
    [updateActiveSlide]
  );

  const handleMoveLayerOrder = (
    layerId: string,
    direction: 'up' | 'down' | 'top' | 'bottom'
  ) => {
    updateActiveSlide((slide) => {
      const sorted = [...slide.layers].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((l) => l.id === layerId);
      if (idx === -1) return slide;

      if (direction === 'up' && idx < sorted.length - 1) {
        const temp = sorted[idx];
        sorted[idx] = sorted[idx + 1];
        sorted[idx + 1] = temp;
      } else if (direction === 'down' && idx > 0) {
        const temp = sorted[idx];
        sorted[idx] = sorted[idx - 1];
        sorted[idx - 1] = temp;
      } else if (direction === 'top') {
        const [item] = sorted.splice(idx, 1);
        sorted.push(item);
      } else if (direction === 'bottom') {
        const [item] = sorted.splice(idx, 1);
        sorted.unshift(item);
      }

      const reindexed = sorted.map((l, i) => ({ ...l, zIndex: i + 1 }));
      return { ...slide, layers: reindexed };
    });
  };

  const handleDuplicateLayer = useCallback(
    (layerId: string) => {
      updateActiveSlide((slide) => {
        const target = slide.layers.find((l) => l.id === layerId);
        if (!target) return slide;
        const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
        const clone: CanvasLayer = {
          ...JSON.parse(JSON.stringify(target)),
          id: `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${target.name} Copy`,
          x: Math.min(920, target.x + 35),
          y: Math.min(920, target.y + 35),
          zIndex: maxZ + 1,
        };
        setSelectedLayerIds([clone.id]);
        return { ...slide, layers: [...slide.layers, clone] };
      });
    },
    [updateActiveSlide]
  );

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      updateActiveSlide((slide) => ({
        ...slide,
        layers: slide.layers.filter((l) => l.id !== layerId),
      }));
      setSelectedLayerIds((prev) => prev.filter((id) => id !== layerId));
    },
    [updateActiveSlide]
  );

  const handleCopySelectedLayer = useCallback(() => {
    const id = selectedLayerIds[0];
    const found = activeSlide.layers.find((l) => l.id === id);
    if (found) {
      clipboardLayerRef.current = JSON.parse(JSON.stringify(found));
    }
  }, [selectedLayerIds, activeSlide.layers]);

  const handlePasteLayer = useCallback(() => {
    const clip = clipboardLayerRef.current;
    if (!clip) return;
    updateActiveSlide((slide) => {
      const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const pasted: CanvasLayer = {
        ...JSON.parse(JSON.stringify(clip)),
        id: `lyr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${clip.name} Pasted`,
        x: Math.min(920, clip.x + 30),
        y: Math.min(920, clip.y + 30),
        zIndex: maxZ + 1,
      };
      setSelectedLayerIds([pasted.id]);
      return { ...slide, layers: [...slide.layers, pasted] };
    });
  }, [updateActiveSlide]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedLayerIds[0]) handleDuplicateLayer(selectedLayerIds[0]);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopySelectedLayer();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePasteLayer();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedLayerIds.length > 0) {
          e.preventDefault();
          selectedLayerIds.forEach((id) => handleDeleteLayer(id));
        }
      } else if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) &&
        selectedLayerIds[0]
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 15 : 3;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        handleUpdateLayer(selectedLayerIds[0], (l) => ({
          ...l,
          x: l.x + dx,
          y: l.y + dy,
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleUndo,
    handleRedo,
    selectedLayerIds,
    handleDuplicateLayer,
    handleDeleteLayer,
    handleCopySelectedLayer,
    handlePasteLayer,
    handleUpdateLayer,
  ]);

  const handleAddTextLayer = (
    preset: 'hero' | 'title' | 'kicker' | 'body' | 'gradient-display' | 'pill-tag'
  ) => {
    updateActiveSlide((slide) => {
      const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const existingTexts = slide.layers.filter((l) => l.type === 'text').length;
      const yOffset = (existingTexts % 5) * 34;
      const isLightBg =
        slide.background.solidColor.startsWith('#F') ||
        slide.background.solidColor.startsWith('#E') ||
        slide.background.solidColor.startsWith('#W');
      const baseText: TextLayer = {
        id: `txt_${Date.now()}`,
        name:
          preset === 'hero'
            ? 'Display Headline'
            : preset === 'pill-tag'
            ? 'Feature Kicker Pill'
            : preset === 'gradient-display'
            ? 'Gradient Title'
            : `Text Layer ${existingTexts + 1}`,
        type: 'text',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: maxZ + 1,
        text:
          preset === 'hero'
            ? 'Designed for Speed'
            : preset === 'title'
            ? 'New Custom Headline'
            : preset === 'pill-tag'
            ? '01 · NEW FEATURE'
            : preset === 'gradient-display'
            ? 'Unrivaled Performance'
            : 'Double-click or use the right inspector to edit this text.',
        x: 500,
        y: Math.min(880, (preset === 'pill-tag' ? 110 : preset === 'body' ? 285 : 200) + yOffset),
        width: 820,
        fontFamily: preset === 'body' ? 'DM Sans' : 'Plus Jakarta Sans',
        fontSize:
          preset === 'hero' || preset === 'gradient-display'
            ? 50
            : preset === 'title'
            ? 36
            : preset === 'pill-tag'
            ? 17
            : 22,
        fontWeight: preset === 'body' ? 500 : 800,
        fontStyle: 'normal',
        color: preset === 'pill-tag' ? '#FFFFFF' : isLightBg ? '#0F172A' : '#FFFFFF',
        gradientEnabled: preset === 'gradient-display',
        gradientColor2: '#38BDF8',
        gradientAngle: 90,
        align: 'center',
        letterSpacing: preset === 'pill-tag' ? 1.5 : -0.5,
        lineHeight: 1.15,
        rotation: 0,
        shadowEnabled: preset === 'gradient-display',
        shadowColor: 'rgba(0,0,0,0.45)',
        shadowBlur: 18,
        shadowOffsetX: 0,
        shadowOffsetY: 6,
        outlineEnabled: false,
        outlineColor: '#000000',
        outlineWidth: 2,
        bgEnabled: preset === 'pill-tag',
        bgColor: '#4F46E5',
        bgOpacity: 0.95,
        bgPaddingX: 22,
        bgPaddingY: 10,
        bgRadius: 999,
      };
      setSelectedLayerIds([baseText.id]);
      return { ...slide, layers: [...slide.layers, baseText] };
    });
  };

  const handleUploadStickerImage = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        threeDeviceEngine.preloadImage(url).then(() => {
          updateActiveSlide((slide) => {
            const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
            const imgLayer: ShapeLayer = {
              id: `shp_img_${Date.now()}`,
              name: file.name.replace(/\.[^.]+$/, '') || 'Custom Image',
              type: 'shape',
              visible: true,
              locked: false,
              opacity: 1,
              zIndex: maxZ + 1,
              shapeKind: 'image',
              x: 500,
              y: 380,
              width: 260,
              height: 260,
              rotation: 0,
              fill: '#FFFFFF',
              fillGradientEnabled: false,
              fillGradientColor2: '#FFFFFF',
              fillGradientAngle: 0,
              stroke: 'transparent',
              strokeWidth: 0,
              cornerRadius: 28,
              blur: 0,
              imageUrl: url,
              shadowEnabled: true,
              shadowColor: 'rgba(0,0,0,0.35)',
              shadowBlur: 24,
              shadowOffsetY: 10,
            };
            setSelectedLayerIds([imgLayer.id]);
            return { ...slide, layers: [...slide.layers, imgLayer] };
          });
        });
      };
      reader.readAsDataURL(file);
    },
    [updateActiveSlide]
  );

  const handleAddDeviceLayer = (deviceId: DeviceModelId, asClay = false) => {
    const spec = DEVICE_SPECS[deviceId];
    updateActiveSlide((slide) => {
      const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const existingDevices = slide.layers.filter((l) => l.type === 'device').length;
      const newDev: DeviceLayer = {
        id: `dev_${Date.now()}`,
        name: asClay ? `3D Clay ${spec.shortName}` : `3D ${spec.shortName}`,
        type: 'device',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: maxZ + 1,
        deviceId,
        finishId: spec.finishes[0].id,
        isClayMaterial: asClay,
        clayColor: asClay ? '#F8FAFC' : undefined,
        x: Math.min(800, 500 + existingDevices * 65),
        y: 635,
        scale: 0.78,
        rotationX: -8,
        rotationY: existingDevices % 2 === 0 ? -18 : 18,
        rotationZ: existingDevices % 2 === 0 ? 3 : -3,
        fov: 36,
        screenshotUrl: activeProject.uploadedScreenshots[0]?.dataUrl,
        screenshotFit: 'cover',
        screenshotScale: 1,
        screenshotOffsetX: 0,
        screenshotOffsetY: 0,
        demoScreenVariant: existingDevices % 10,
        glareIntensity: asClay ? 0.14 : 0.35,
        showHardwareButtons: true,
        shadowEnabled: true,
        shadowColor: 'rgba(15,23,42,0.35)',
        shadowBlur: 50,
        shadowOpacity: 0.45,
        shadowOffsetX: 0,
        shadowOffsetY: 26,
        contactShadow3D: true,
      };
      setSelectedLayerIds([newDev.id]);
      return { ...slide, layers: [...slide.layers, newDev] };
    });
  };

  const handleAddShapeLayer = (kind: ShapeKind) => {
    updateActiveSlide((slide) => {
      const maxZ = slide.layers.reduce((m, l) => Math.max(m, l.zIndex), 0);
      const newShape: ShapeLayer = {
        id: `shp_${Date.now()}`,
        name:
          kind === 'clay-sphere'
            ? '3D Clay Sphere'
            : kind === 'clay-card'
            ? '3D Clay Card'
            : kind === 'feature-card'
            ? 'KPI Callout Card'
            : kind === 'pill'
            ? 'Rating Pill Badge'
            : kind === 'app-icon'
            ? 'App Icon Badge'
            : kind === 'glow-orb'
            ? 'Ambient Glow Orb'
            : 'Decorative Shape',
        type: 'shape',
        visible: true,
        locked: false,
        opacity: kind === 'glow-orb' ? 0.45 : 1,
        zIndex: kind === 'glow-orb' ? 1 : maxZ + 1,
        shapeKind: kind,
        x: 500,
        y: kind === 'pill' ? 95 : 500,
        width:
          kind === 'feature-card' || kind === 'clay-card'
            ? 380
            : kind === 'pill'
            ? 420
            : kind === 'glow-orb'
            ? 650
            : kind === 'clay-sphere'
            ? 190
            : 180,
        height:
          kind === 'feature-card' || kind === 'clay-card'
            ? 100
            : kind === 'pill'
            ? 52
            : kind === 'glow-orb'
            ? 650
            : kind === 'clay-sphere'
            ? 190
            : 180,
        rotation: 0,
        fill: kind === 'clay-card' ? '#FFFFFF' : '#4F46E5',
        fillGradientEnabled: kind === 'app-icon' || kind === 'feature-card',
        fillGradientColor2: '#06B6D4',
        fillGradientAngle: 135,
        stroke: 'rgba(255,255,255,0.28)',
        strokeWidth: kind === 'feature-card' || kind === 'app-icon' ? 2 : 0,
        cornerRadius: kind === 'pill' ? 999 : 26,
        blur: 0,
        label:
          kind === 'feature-card' || kind === 'clay-card'
            ? '+140% Efficiency'
            : kind === 'pill'
            ? '★ 4.9 APP STORE RATING'
            : kind === 'app-icon'
            ? 'APP'
            : undefined,
        sublabel:
          kind === 'feature-card' || kind === 'clay-card'
            ? 'Real-Time Telemetry'
            : undefined,
        textColor: kind === 'clay-card' ? '#0F172A' : '#FFFFFF',
        shadowEnabled: kind !== 'glow-orb',
        shadowColor: 'rgba(15,23,42,0.25)',
        shadowBlur: 24,
        shadowOffsetY: 10,
      };
      setSelectedLayerIds([newShape.id]);
      return { ...slide, layers: [...slide.layers, newShape] };
    });
  };

  const handleUploadScreenshots = (files: FileList) => {
    Array.from(files).forEach((file, fileIdx) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const img = new Image();
        img.onload = () => {
          threeDeviceEngine.preloadImage(dataUrl).then(() => {
            const uploaded: UploadedScreenshot = {
              id: `shot_${Date.now()}_${fileIdx}`,
              name: file.name.replace(/\.[^.]+$/, ''),
              dataUrl,
              width: img.width,
              height: img.height,
              aspectRatio: img.width / img.height,
              createdAt: Date.now(),
            };

            updateActiveProject((proj) => {
              const nextShots = [...proj.uploadedScreenshots, uploaded];
              const nextSlides = proj.slides.map((s, sIdx) => ({
                ...s,
                layers: s.layers.map((l) => {
                  if (l.type !== 'device') return l;
                  const dev = l as DeviceLayer;
                  if (!dev.screenshotUrl || sIdx === safeSlideIdx) {
                    const shotForSlide = nextShots[(sIdx + fileIdx) % nextShots.length];
                    return { ...dev, screenshotUrl: shotForSlide.dataUrl };
                  }
                  return dev;
                }),
              }));
              return {
                ...proj,
                uploadedScreenshots: nextShots,
                slides: nextSlides,
              };
            });
          });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSampleScreenshots = async () => {
    const sampleNames = [
      'PulsePay_NetWorth_Dashboard',
      'Kinetix_VO2Max_Coach',
      'Chronos_DeepWork_Planner',
      'SonicWave_Spatial_DSP',
      'AeroFlight_Gate_Live',
    ];
    const generatedShots: UploadedScreenshot[] = [];

    for (let i = 0; i < 5; i++) {
      const canvas = getDemoScreenCanvas(i, 720, 1560);
      const dataUrl = canvas.toDataURL('image/png');
      await threeDeviceEngine.preloadImage(dataUrl);
      generatedShots.push({
        id: `sample_${Date.now()}_${i}`,
        name: sampleNames[i],
        dataUrl,
        width: 720,
        height: 1560,
        aspectRatio: 720 / 1560,
        createdAt: Date.now(),
      });
    }

    updateActiveProject((proj) => {
      const allShots = [...proj.uploadedScreenshots, ...generatedShots];
      let counter = 0;
      const populatedSlides = proj.slides.map((s) => ({
        ...s,
        layers: s.layers.map((l) => {
          if (l.type !== 'device') return l;
          const shot = allShots[counter % allShots.length];
          counter++;
          return { ...(l as DeviceLayer), screenshotUrl: shot.dataUrl };
        }),
      }));
      return {
        ...proj,
        uploadedScreenshots: allShots,
        slides: populatedSlides,
      };
    });
  };

  const handleAutoPopulateAllSlides = () => {
    if (activeProject.uploadedScreenshots.length === 0) return;
    updateActiveProject((proj) => {
      let devIdx = 0;
      const nextSlides = proj.slides.map((s) => ({
        ...s,
        layers: s.layers.map((l) => {
          if (l.type !== 'device') return l;
          const shot =
            proj.uploadedScreenshots[devIdx % proj.uploadedScreenshots.length];
          devIdx++;
          return { ...(l as DeviceLayer), screenshotUrl: shot.dataUrl };
        }),
      }));
      return { ...proj, slides: nextSlides };
    });
  };

  const handleAssignScreenshotToDevice = (deviceLayerId: string, screenshotUrl: string) => {
    threeDeviceEngine.preloadImage(screenshotUrl).then(() => {
      handleUpdateLayer(deviceLayerId, (l) => ({
        ...(l as DeviceLayer),
        screenshotUrl,
      }));
    });
  };

  const handleUpdateAllDevicesOnSlide = useCallback(
    (updater: (dev: DeviceLayer) => DeviceLayer) => {
      updateActiveSlide((slide) => ({
        ...slide,
        layers: slide.layers.map((l) =>
          l.type === 'device' ? updater(l as DeviceLayer) : l
        ),
      }));
    },
    [updateActiveSlide]
  );

  const handleApplyDeviceModelToAllSlides = (deviceId: DeviceModelId) => {
    const spec = DEVICE_SPECS[deviceId];
    updateActiveProject((proj) => ({
      ...proj,
      featuredGraphicSlide: {
        ...proj.featuredGraphicSlide,
        layers: proj.featuredGraphicSlide.layers.map((l) =>
          l.type === 'device'
            ? {
                ...(l as DeviceLayer),
                deviceId,
                finishId: spec.finishes[0].id,
              }
            : l
        ),
      },
      slides: proj.slides.map((s) => ({
        ...s,
        layers: s.layers.map((l) =>
          l.type === 'device'
            ? {
                ...(l as DeviceLayer),
                deviceId,
                finishId: spec.finishes[0].id,
              }
            : l
        ),
      })),
    }));
  };

  const handleAlignLayer = (
    layerId: string,
    alignment: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom'
  ) => {
    handleUpdateLayer(layerId, (l) => {
      if (alignment === 'left') return { ...l, x: 220 };
      if (alignment === 'center-x') return { ...l, x: 500 };
      if (alignment === 'right') return { ...l, x: 780 };
      if (alignment === 'top') return { ...l, y: 140 };
      if (alignment === 'center-y') return { ...l, y: 500 };
      if (alignment === 'bottom') return { ...l, y: 860 };
      return l;
    });
  };

  const selectedDeviceOnSlide = activeSlide.layers.find(
    (l): l is DeviceLayer => l.type === 'device' && selectedLayerIds.includes(l.id)
  );
  const primaryDeviceOnSlide =
    selectedDeviceOnSlide ||
    activeSlide.layers.find((l): l is DeviceLayer => l.type === 'device');

  const hasContinuitySlides = activeProject.slides.some(
    (s) => s.background.continuityType && s.background.continuityType !== 'none'
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* =====================================================================
          1. TOP HEADER BAR (Strict 3-Zone Contract: Brand | Nav Links | 1 Primary CTA)
         ===================================================================== */}
      <header className="h-12 px-5 border-b border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F19] flex items-center justify-between gap-6 shrink-0">
        {/* Zone 1: Single Text Element Wordmark */}
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setWorkspaceMode('screenshots');
          }}
          className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          MockupForge 3D Studio
        </a>

        {/* Zone 2: 4 Concise Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <a
            href="#screenshots"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceMode('screenshots');
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspaceMode === 'screenshots'
                ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-500'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Screenshots Studio
          </a>
          <a
            href="#featured-graphic"
            onClick={(e) => {
              e.preventDefault();
              setWorkspaceMode('featured-graphic');
              setSelectedLayerIds([]);
            }}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
              workspaceMode === 'featured-graphic'
                ? 'text-indigo-600 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-500'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Featured Graphic 1024×500
          </a>
          <a
            href="#batch-generator"
            onClick={(e) => {
              e.preventDefault();
              setExportModalState({ open: true, mode: 'batch' });
            }}
            className="py-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Multi-Device Batch
          </a>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              setProjectsModalOpen(true);
            }}
            className="py-1 hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Projects ({projects.length})
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setExportModalState({ open: true, mode: 'export' })}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export High-Res
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. SECONDARY WORKSPACE STUDIO TOOLBAR
         ===================================================================== */}
      <div className="h-10 px-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0E1422] flex items-center justify-between gap-3 shrink-0 text-xs select-none overflow-x-auto">
        {/* Left: Project Name & Undo/Redo/Copy/Paste */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setProjectsModalOpen(true)}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold truncate max-w-[165px] shadow-2xs"
            title="Switch or manage saved projects"
          >
            {activeProject.name}
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={historyPast.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-35"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyFuture.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-35"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={handleCopySelectedLayer}
            disabled={selectedLayerIds.length === 0}
            title="Copy Selected Layer (Ctrl+C)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-35"
          >
            <ClipboardCopy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handlePasteLayer}
            title="Paste Layer (Ctrl+V)"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          {/* Quick Add Text / Add Image / Delete Selected Layer directly in Toolbar */}
          <button
            type="button"
            onClick={() => handleAddTextLayer('title')}
            className="px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1 whitespace-nowrap transition-colors"
            title="Add New Text Layer to Layout"
          >
            <Type className="w-3.5 h-3.5" />
            <span>+ Add Text</span>
          </button>

          <label
            className="px-2 py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
            title="Upload & Add Custom Image / Logo Layer to Layout"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>+ Add Image</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadStickerImage(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          {selectedLayerIds.length > 0 && (
            <button
              type="button"
              onClick={() => selectedLayerIds.forEach((id) => handleDeleteLayer(id))}
              className="px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-300 font-semibold flex items-center gap-1 whitespace-nowrap transition-colors"
              title="Remove Selected Layer (Delete)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          )}
        </div>

        {/* Center: Quick 3D Device Model Switcher, Store Preset & Panorama Continuity View */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">3D Phone:</span>
            <select
              value={primaryDeviceOnSlide?.deviceId || 'iphone-17-pro-max'}
              onChange={(e) => {
                const nextId = e.target.value as DeviceModelId;
                const spec = DEVICE_SPECS[nextId];
                if (primaryDeviceOnSlide) {
                  handleUpdateAllDevicesOnSlide((dev) => ({
                    ...dev,
                    deviceId: nextId,
                    finishId: spec.finishes[0].id,
                  }));
                } else {
                  handleAddDeviceLayer(nextId);
                }
              }}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <optgroup label="Apple iPhone" className="bg-white dark:bg-slate-900">
                {DEVICE_LIST.filter((d) => d.platform === 'apple').map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Android Flagships" className="bg-white dark:bg-slate-900">
                {DEVICE_LIST.filter((d) => d.platform === 'android').map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {workspaceMode === 'screenshots' && (
            <>
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Store:</span>
                <select
                  value={activeProject.activePresetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    updateActiveProject((p) => ({ ...p, activePresetId: id }));
                  }}
                  className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {EXPORT_PRESETS.filter((p) => p.store !== 'featured').map((p) => (
                    <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                      {p.name} ({p.width}×{p.height})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsPanoramaMode((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border transition-colors ${
                  isPanoramaMode
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="View all slides connected side-by-side to inspect Continuous Flow backgrounds"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Panorama Strip</span>
              </button>
            </>
          )}
        </div>

        {/* Right: Zoom Controls, Preview & Light/Dark Theme Switcher */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 w-11 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.65, Number((z + 0.1).toFixed(2))))}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.95)}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800"
            title="Fit to Stage"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

          <button
            type="button"
            onClick={() => setFullPreviewOpen(true)}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-1 whitespace-nowrap shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Preview
          </button>

          <button
            type="button"
            onClick={() => setIsDarkMode((d) => !d)}
            className="p-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          3. MAIN 3-COLUMN STUDIO WORKSPACE (Compact Left | Spacious Center Stage | Compact Right)
         ===================================================================== */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar Drawer */}
        <LeftSidebarPanel
          activeTab={leftTab}
          onSelectTab={setLeftTab}
          isCollapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((c) => !c)}
          workspaceMode={workspaceMode}
          activeSlide={activeSlide}
          selectedLayerIds={selectedLayerIds}
          onSelectLayers={setSelectedLayerIds}
          onApplyTemplatePackAllSlides={(pack: TemplatePack) => {
            updateActiveProject((proj) => {
              const newSlides: SlideDesign[] = pack.layouts.map((item, idx) => {
                const cloned: SlideDesign = JSON.parse(JSON.stringify(item.slide));
                if (proj.uploadedScreenshots.length > 0) {
                  cloned.layers = cloned.layers.map((l) => {
                    if (l.type === 'device') {
                      const shot =
                        proj.uploadedScreenshots[idx % proj.uploadedScreenshots.length];
                      return { ...(l as DeviceLayer), screenshotUrl: shot.dataUrl };
                    }
                    return l;
                  });
                }
                return cloned;
              });
              setActiveSlideIndex(0);
              setSelectedLayerIds([]);
              return { ...proj, slides: newSlides };
            });
          }}
          onApplySingleLayoutToActiveSlide={(layout: TemplateLayoutItem) => {
            updateActiveSlide((currentSlide) => {
              const existingDevices = currentSlide.layers.filter(
                (l): l is DeviceLayer => l.type === 'device'
              );
              const nextSlide: SlideDesign = JSON.parse(JSON.stringify(layout.slide));
              let dIdx = 0;
              nextSlide.layers = nextSlide.layers.map((l) => {
                if (l.type === 'device') {
                  const prevShot =
                    existingDevices[dIdx]?.screenshotUrl ||
                    activeProject.uploadedScreenshots[
                      dIdx % Math.max(1, activeProject.uploadedScreenshots.length)
                    ]?.dataUrl;
                  dIdx++;
                  return { ...(l as DeviceLayer), screenshotUrl: prevShot };
                }
                return l;
              });
              setSelectedLayerIds([]);
              return nextSlide;
            });
          }}
          onAddLayoutAsNewSlide={(layout: TemplateLayoutItem) => {
            updateActiveProject((proj) => {
              const nextSlide: SlideDesign = JSON.parse(JSON.stringify(layout.slide));
              nextSlide.id = `slide_${Date.now()}`;
              if (proj.uploadedScreenshots.length > 0) {
                nextSlide.layers = nextSlide.layers.map((l, i) =>
                  l.type === 'device'
                    ? {
                        ...(l as DeviceLayer),
                        screenshotUrl:
                          proj.uploadedScreenshots[i % proj.uploadedScreenshots.length]
                            .dataUrl,
                      }
                    : l
                );
              }
              const nextSlides = [...proj.slides, nextSlide];
              setActiveSlideIndex(nextSlides.length - 1);
              return { ...proj, slides: nextSlides };
            });
          }}
          onApplyFeaturedTemplate={(fgSlide: SlideDesign) => {
            updateActiveProject((proj) => ({
              ...proj,
              featuredGraphicSlide: JSON.parse(JSON.stringify(fgSlide)),
            }));
          }}
          onReuseScreenshotElementsInFeatured={() => {
            const refSlide = activeProject.slides[safeSlideIdx] || activeProject.slides[0];
            const refDev = refSlide.layers.find(
              (l): l is DeviceLayer => l.type === 'device'
            );
            updateActiveProject((proj) => {
              const fg = JSON.parse(JSON.stringify(proj.featuredGraphicSlide)) as SlideDesign;
              fg.background = JSON.parse(JSON.stringify(refSlide.background));
              if (refDev) {
                fg.layers = fg.layers.map((l) =>
                  l.type === 'device'
                    ? {
                        ...(l as DeviceLayer),
                        deviceId: refDev.deviceId,
                        finishId: refDev.finishId,
                        isClayMaterial: refDev.isClayMaterial,
                        clayColor: refDev.clayColor,
                        screenshotUrl: refDev.screenshotUrl,
                      }
                    : l
                );
              }
              return { ...proj, featuredGraphicSlide: fg };
            });
          }}
          uploadedScreenshots={activeProject.uploadedScreenshots}
          onUploadFiles={handleUploadScreenshots}
          onAutoPopulateAllSlides={handleAutoPopulateAllSlides}
          onAssignScreenshotToDevice={handleAssignScreenshotToDevice}
          onDeleteUploadedScreenshot={(shotId) => {
            updateActiveProject((proj) => ({
              ...proj,
              uploadedScreenshots: proj.uploadedScreenshots.filter((s) => s.id !== shotId),
            }));
          }}
          onLoadSampleScreenshots={handleLoadSampleScreenshots}
          onUpdateBackground={(updater) => {
            updateActiveSlide((s) => ({
              ...s,
              background: updater(s.background),
            }));
          }}
          savedBackgrounds={activeProject.savedBackgrounds}
          onSaveCurrentBackground={(name) => {
            const preset: SavedBackgroundPreset = {
              id: `bg_${Date.now()}`,
              name,
              config: JSON.parse(JSON.stringify(activeSlide.background)),
            };
            updateActiveProject((proj) => ({
              ...proj,
              savedBackgrounds: [...proj.savedBackgrounds, preset],
            }));
          }}
          onDeleteSavedBackground={(id) => {
            updateActiveProject((proj) => ({
              ...proj,
              savedBackgrounds: proj.savedBackgrounds.filter((b) => b.id !== id),
            }));
          }}
          onUploadBackgroundImage={(file) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = String(reader.result);
              threeDeviceEngine.preloadImage(url).then(() => {
                updateActiveSlide((s) => ({
                  ...s,
                  background: {
                    ...s.background,
                    type: 'image',
                    imageUrl: url,
                  },
                }));
              });
            };
            reader.readAsDataURL(file);
          }}
          onAddTextLayer={handleAddTextLayer}
          onAddDeviceLayer={handleAddDeviceLayer}
          onAddShapeLayer={handleAddShapeLayer}
          onUploadStickerImage={handleUploadStickerImage}
          onUpdateLayer={(layerId, updater) => handleUpdateLayer(layerId, updater)}
          onMoveLayerOrder={handleMoveLayerOrder}
          onDuplicateLayer={handleDuplicateLayer}
          onDeleteLayer={handleDeleteLayer}
          onGroupSelectedLayers={() => {
            if (selectedLayerIds.length < 2) return;
            const grpId = `grp_${Date.now()}`;
            updateActiveSlide((slide) => ({
              ...slide,
              layers: slide.layers.map((l) =>
                selectedLayerIds.includes(l.id) ? { ...l, groupId: grpId } : l
              ),
            }));
          }}
          onUngroupSelectedLayers={() => {
            updateActiveSlide((slide) => ({
              ...slide,
              layers: slide.layers.map((l) =>
                selectedLayerIds.includes(l.id) ? { ...l, groupId: undefined } : l
              ),
            }));
          }}
        />

        {/* Center Workspace: Spacious Design Stage + Compact Bottom Storyboard */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-100/90 dark:bg-[#070A11] min-w-0">
          {/* Interactive Canvas Stage */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
            {isPanoramaMode && workspaceMode === 'screenshots' ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-500/40 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  <Workflow className="w-3.5 h-3.5" />
                  <span>
                    Panoramic Continuity View — Click any slide below to edit it in the active stage
                  </span>
                </div>
                <div className="flex items-center justify-center gap-0 rounded-2xl overflow-hidden shadow-2xl ring-2 ring-indigo-500/30 bg-slate-950">
                  {activeProject.slides.map((s, idx) => {
                    const isCurrent = idx === safeSlideIdx;
                    const panoW = Math.round(210 * zoom);
                    const panoH = Math.round(
                      panoW * (activePreset.height / activePreset.width)
                    );
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveSlideIndex(idx);
                          setIsPanoramaMode(false);
                        }}
                        className={`relative cursor-pointer group transition-transform ${
                          isCurrent ? 'ring-2 ring-indigo-500 z-10' : 'hover:opacity-95'
                        }`}
                      >
                        <SlidePreviewCanvas
                          slide={s}
                          width={panoW}
                          height={panoH}
                          useFastThumbnail={false}
                          className="block"
                        />
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/75 text-white text-[10px] font-bold">
                          Slide {idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <InteractiveDesignCanvas
                slide={activeSlide}
                aspectWidth={activePreset.width}
                aspectHeight={activePreset.height}
                zoom={zoom}
                selectedLayerIds={selectedLayerIds}
                onSelectLayers={setSelectedLayerIds}
                onUpdateLayer={handleUpdateLayer}
                onCommitHistory={commitHistorySnapshot}
                onDuplicateSelected={() => {
                  if (selectedLayerIds[0]) handleDuplicateLayer(selectedLayerIds[0]);
                }}
                onDeleteSelected={() => {
                  selectedLayerIds.forEach((id) => handleDeleteLayer(id));
                }}
                onDropScreenshotOnDevice={handleAssignScreenshotToDevice}
              />
            )}
          </div>

          {/* Compact Bottom Multi-Slide Storyboard Filmstrip (88px height) */}
          {workspaceMode === 'screenshots' && (
            <div className="h-[88px] border-t border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B0F18] px-4 py-1.5 flex items-center gap-3 overflow-x-auto shrink-0 select-none">
              <div className="flex flex-col justify-center pr-2 border-r border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {hasContinuitySlides && (
                    <Workflow className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  )}
                  <span>Storyboard</span>
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {activeProject.slides.length} Slides
                </span>
              </div>

              <div
                className={`flex items-center ${
                  hasContinuitySlides ? 'gap-0.5' : 'gap-2'
                }`}
              >
                {activeProject.slides.map((slideItem, idx) => {
                  const isCurrent = idx === safeSlideIdx;
                  return (
                    <div
                      key={slideItem.id}
                      onClick={() => {
                        setActiveSlideIndex(idx);
                        setSelectedLayerIds([]);
                      }}
                      className={`group relative rounded-lg p-1 border transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                        isCurrent
                          ? 'bg-indigo-50/90 dark:bg-indigo-600/20 border-indigo-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="w-[30px] h-[62px] rounded overflow-hidden bg-slate-950 shrink-0">
                        <SlidePreviewCanvas
                          slide={slideItem}
                          width={36}
                          height={76}
                          useFastThumbnail={true}
                          className="w-full h-full object-cover block"
                        />
                      </div>

                      <div className="pr-1.5 max-w-[92px]">
                        <div className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          SLIDE 0{idx + 1}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {slideItem.name}
                        </div>
                        <div
                          className="flex items-center gap-0.5 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => {
                              updateActiveProject((proj) => {
                                const list = [...proj.slides];
                                const temp = list[idx - 1];
                                list[idx - 1] = list[idx];
                                list[idx] = temp;
                                setActiveSlideIndex(idx - 1);
                                return { ...proj, slides: list };
                              });
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === activeProject.slides.length - 1}
                            onClick={() => {
                              updateActiveProject((proj) => {
                                const list = [...proj.slides];
                                const temp = list[idx + 1];
                                list[idx + 1] = list[idx];
                                list[idx] = temp;
                                setActiveSlideIndex(idx + 1);
                                return { ...proj, slides: list };
                              });
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-25"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              updateActiveProject((proj) => {
                                const clone: SlideDesign = {
                                  ...JSON.parse(JSON.stringify(slideItem)),
                                  id: `slide_${Date.now()}`,
                                  name: `${slideItem.name} Copy`,
                                };
                                const list = [...proj.slides];
                                list.splice(idx + 1, 0, clone);
                                setActiveSlideIndex(idx + 1);
                                return { ...proj, slides: list };
                              });
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            title="Duplicate Slide"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          {activeProject.slides.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                updateActiveProject((proj) => {
                                  const list = proj.slides.filter((_, i) => i !== idx);
                                  setActiveSlideIndex(Math.max(0, idx - 1));
                                  return { ...proj, slides: list };
                                });
                              }}
                              className="p-0.5 text-slate-400 hover:text-rose-500"
                              title="Delete Slide"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    updateActiveProject((proj) => {
                      const templateRef =
                        proj.slides[proj.slides.length - 1] || proj.slides[0];
                      const nextSlide: SlideDesign = {
                        ...JSON.parse(JSON.stringify(templateRef)),
                        id: `slide_${Date.now()}`,
                        name: `Slide ${proj.slides.length + 1}`,
                      };
                      const nextList = [...proj.slides, nextSlide];
                      setActiveSlideIndex(nextList.length - 1);
                      return { ...proj, slides: nextList };
                    });
                  }}
                  className="h-[68px] px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-900/40 hover:bg-indigo-50/40 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white flex flex-col items-center justify-center gap-1 shrink-0 transition-colors"
                >
                  <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-[10px] font-semibold">Add Slide</span>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Compact Right Contextual Inspector */}
        <RightPropertiesPanel
          activeSlide={activeSlide}
          selectedLayerIds={selectedLayerIds}
          uploadedScreenshots={activeProject.uploadedScreenshots}
          isCollapsed={rightCollapsed}
          onToggleCollapse={() => setRightCollapsed((c) => !c)}
          onUpdateLayer={(layerId, updater) => handleUpdateLayer(layerId, updater)}
          onUpdateAllDevicesOnSlide={handleUpdateAllDevicesOnSlide}
          onApplyDeviceModelToAllSlides={handleApplyDeviceModelToAllSlides}
          onUploadScreenshotForDevice={(deviceLayerId, file) => {
            const reader = new FileReader();
            reader.onload = () => {
              const url = String(reader.result);
              handleAssignScreenshotToDevice(deviceLayerId, url);
            };
            reader.readAsDataURL(file);
          }}
          onAlignLayer={handleAlignLayer}
          onAddTextLayer={handleAddTextLayer}
          onUploadStickerImage={handleUploadStickerImage}
          onAddDeviceLayer={handleAddDeviceLayer}
          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
        />
      </div>

      {/* =====================================================================
          4. FULL STORYBOARD & FEATURED GRAPHIC PREVIEW MODAL
         ===================================================================== */}
      {fullPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 dark:bg-slate-950/90 backdrop-blur-xs flex flex-col p-6 select-none">
          <div className="flex items-center justify-between pb-4 border-b border-white/15">
            <div>
              <h2 className="text-base font-bold text-white">
                App Store & Google Play Store Listing Preview — {activeProject.name}
              </h2>
              <p className="text-xs text-slate-300">
                Target Preset: {activePreset.name} ({activePreset.width} × {activePreset.height}px)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFullPreviewOpen(false);
                  setExportModalState({ open: true, mode: 'export' });
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Proceed to Export
              </button>
              <button
                type="button"
                onClick={() => setFullPreviewOpen(false)}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto flex items-center gap-4 py-6 px-4">
            {activeProject.slides.map((s, idx) => (
              <div key={s.id} className="shrink-0 space-y-2 text-center">
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/15 bg-slate-900">
                  <SlidePreviewCanvas
                    slide={s}
                    width={250}
                    height={Math.round(250 * (activePreset.height / activePreset.width))}
                    useFastThumbnail={false}
                    className="block"
                  />
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  0{idx + 1} · {s.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          5. DEDICATED HIGH-RES EXPORT & MULTI-DEVICE BATCH GENERATOR MODAL
         ===================================================================== */}
      <BatchAndExportModal
        isOpen={exportModalState.open}
        initialMode={exportModalState.mode}
        onClose={() => setExportModalState((prev) => ({ ...prev, open: false }))}
        slides={activeProject.slides}
        activeSlideIndex={safeSlideIdx}
        featuredGraphicSlide={activeProject.featuredGraphicSlide}
        activePreset={activePreset}
        onSelectPreset={(preset) => {
          if (preset.store === 'featured') {
            setWorkspaceMode('featured-graphic');
          } else {
            setWorkspaceMode('screenshots');
            updateActiveProject((p) => ({ ...p, activePresetId: preset.id }));
          }
        }}
        onCustomizeBatchVersion={(adaptedSlide, preset) => {
          setWorkspaceMode('screenshots');
          updateActiveProject((proj) => {
            const customSlide: SlideDesign = {
              ...JSON.parse(JSON.stringify(adaptedSlide)),
              id: `slide_batch_${Date.now()}`,
              name: `${adaptedSlide.name} (${preset.aspectLabel})`,
            };
            const nextList = [...proj.slides, customSlide];
            setActiveSlideIndex(nextList.length - 1);
            return {
              ...proj,
              activePresetId: preset.id,
              slides: nextList,
            };
          });
        }}
      />

      {/* =====================================================================
          6. SAVED PROJECTS & WORKSPACE MANAGER MODAL
         ===================================================================== */}
      <ProjectsModal
        isOpen={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={projects}
        activeProjectId={activeProject.id}
        onSelectProject={(proj) => {
          setActiveProjectId(proj.id);
          setActiveSlideIndex(0);
          setSelectedLayerIds([]);
          setHistoryPast([]);
          setHistoryFuture([]);
        }}
        onCreateNewProject={(name) => {
          const created = createInitialProject(name);
          setProjects((prev) => [created, ...prev]);
          setActiveProjectId(created.id);
          setActiveSlideIndex(0);
          setSelectedLayerIds([]);
        }}
        onDuplicateProject={(proj) => {
          const copy: StudioProject = {
            ...JSON.parse(JSON.stringify(proj)),
            id: `proj_${Date.now()}`,
            name: `${proj.name} Copy`,
            updatedAt: Date.now(),
          };
          setProjects((prev) => [copy, ...prev]);
        }}
        onDeleteProject={(id) => {
          setProjects((prev) => {
            const remaining = prev.filter((p) => p.id !== id);
            if (activeProject.id === id && remaining[0]) {
              setActiveProjectId(remaining[0].id);
            }
            return remaining;
          });
        }}
        onImportProjectJson={(imported) => {
          const clean: StudioProject = {
            ...imported,
            id: `proj_${Date.now()}`,
            updatedAt: Date.now(),
          };
          setProjects((prev) => [clean, ...prev]);
          setActiveProjectId(clean.id);
          setActiveSlideIndex(0);
        }}
      />
    </div>
  );
}
