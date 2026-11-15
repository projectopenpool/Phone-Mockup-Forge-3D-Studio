export type DevicePlatform = 'apple' | 'android';

export type DeviceModelId =
  | 'iphone-17-pro-max'
  | 'iphone-17-pro'
  | 'iphone-17'
  | 'iphone-16-pro-max'
  | 'iphone-16-pro'
  | 'iphone-16'
  | 'galaxy-s26-ultra'
  | 'galaxy-s26-plus'
  | 'galaxy-s26'
  | 'pixel-10-pro-xl'
  | 'pixel-10-pro'
  | 'pixel-10';

export interface DeviceFinish {
  id: string;
  name: string;
  frameHex: string;
  backHex: string;
  accentHex: string;
  metalness: number;
  roughness: number;
}

export interface DeviceSpec {
  id: DeviceModelId;
  name: string;
  shortName: string;
  platform: DevicePlatform;
  releaseYear: number;
  displayDiagonal: string;
  screenResolution: { width: number; height: number };
  bodyWidth: number;
  bodyHeight: number;
  bodyDepth: number;
  cornerRadius: number;
  bezelWidth: number;
  cutoutType: 'dynamic-island' | 'punch-hole-small' | 'punch-hole-medium';
  cameraBumpType:
    | 'iphone-pro-triple'
    | 'iphone-dual-vertical'
    | 'galaxy-ultra-rings'
    | 'galaxy-triple-rings'
    | 'pixel-visor-pro'
    | 'pixel-visor-dual';
  buttonLayout: 'iphone-16-17' | 'galaxy' | 'pixel';
  finishes: DeviceFinish[];
}

export type LayerType = 'device' | 'text' | 'shape';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  groupId?: string;
}

export interface DeviceLayer extends BaseLayer {
  type: 'device';
  deviceId: DeviceModelId;
  finishId: string;
  customFinishColor?: string;
  isClayMaterial?: boolean;
  clayColor?: string;
  // Position in normalized 0..1000 canvas coordinate space (center of element)
  x: number;
  y: number;
  scale: number;
  // Full 3D perspective rotation in degrees
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  fov: number;
  // Screenshot mapping
  screenshotId?: string;
  screenshotUrl?: string;
  screenshotFit: 'cover' | 'contain' | 'fill';
  screenshotScale: number;
  screenshotOffsetX: number;
  screenshotOffsetY: number;
  demoScreenVariant: number;
  // 3D Lighting & Shadow controls
  glareIntensity: number;
  showHardwareButtons: boolean;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOpacity: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  contactShadow3D: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  x: number;
  y: number;
  width: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  gradientEnabled: boolean;
  gradientColor2: string;
  gradientAngle: number;
  align: 'left' | 'center' | 'right';
  letterSpacing: number;
  lineHeight: number;
  rotation: number;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  outlineEnabled: boolean;
  outlineColor: string;
  outlineWidth: number;
  bgEnabled: boolean;
  bgColor: string;
  bgOpacity: number;
  bgPaddingX: number;
  bgPaddingY: number;
  bgRadius: number;
}

export type ShapeKind =
  | 'rect'
  | 'circle'
  | 'pill'
  | 'star'
  | 'badge'
  | 'glow-orb'
  | 'feature-card'
  | 'app-icon'
  | 'clay-sphere'
  | 'clay-card'
  | 'image';

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeKind: ShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  fillGradientEnabled: boolean;
  fillGradientColor2: string;
  fillGradientAngle: number;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
  blur: number;
  label?: string;
  sublabel?: string;
  textColor?: string;
  imageUrl?: string;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
}

export type CanvasLayer = DeviceLayer | TextLayer | ShapeLayer;

export type BackgroundPattern =
  | 'none'
  | 'dots'
  | 'grid'
  | 'iso-grid'
  | 'waves'
  | 'diagonal'
  | 'crosshair'
  | 'radial-rings';

export type ContinuityFlowType =
  | 'none'
  | 'aurora-wave'
  | 'archway'
  | 'clay-hills'
  | 'diagonal-stripe'
  | 'blueprint-line';

export interface GradientStop {
  id: string;
  color: string;
  position: number;
}

export interface BackgroundConfig {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'mesh-gradient' | '3d-clay-backdrop' | 'image';
  solidColor: string;
  gradientAngle: number;
  gradientStops: GradientStop[];
  imageUrl?: string;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  imageFit: 'cover' | 'contain' | 'fill';
  brightness: number;
  opacity: number;
  blur: number;
  pattern: BackgroundPattern;
  patternColor: string;
  patternOpacity: number;
  patternScale: number;
  // Continuous Flow Background across slides
  continuityType?: ContinuityFlowType;
  continuitySlideIndex?: number; // 0-indexed position in panoramic strip
  continuityTotalSlides?: number; // e.g. 5
  continuityAccent?: string;
  continuitySecondary?: string;
}

export interface SlideDesign {
  id: string;
  name: string;
  background: BackgroundConfig;
  layers: CanvasLayer[];
  notes?: string;
}

export type TemplateCategory =
  | 'continuity-flow'
  | '3d-clay'
  | 'minimalist-clean'
  | 'premium-dark'
  | 'modern-gradients'
  | 'futuristic-tech'
  | 'floating-3d'
  | 'multi-overlapping'
  | 'split-screen'
  | 'bold-typography'
  | 'soft-pastel'
  | 'productivity-pro';

export type TemplateTypeFilter =
  | 'all'
  | 'continuity'
  | '3d-clay'
  | 'single-device'
  | 'multi-device'
  | 'isometric-3d'
  | 'split-bleed'
  | 'minimal-light'
  | 'dark-pro';

export interface TemplateLayoutItem {
  id: string;
  templateId: string;
  categoryId: TemplateCategory;
  categoryName: string;
  layoutIndex: number;
  globalIndex: number;
  name: string;
  description: string;
  compositionTag: string;
  templateType: TemplateTypeFilter[];
  slide: SlideDesign;
}

export interface TemplatePack {
  id: string;
  categoryId: TemplateCategory;
  name: string;
  tagline: string;
  accentColor: string;
  badgeLabel?: string;
  isContinuityPack?: boolean;
  isClayPack?: boolean;
  layouts: TemplateLayoutItem[];
}

export interface UploadedScreenshot {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  createdAt: number;
}

export interface ExportPreset {
  id: string;
  store: 'apple' | 'google-play' | 'featured';
  name: string;
  deviceLabel: string;
  width: number;
  height: number;
  aspectLabel: string;
  requiredByStore: boolean;
  recommendedDeviceId: DeviceModelId;
}

export interface SavedBackgroundPreset {
  id: string;
  name: string;
  config: BackgroundConfig;
}

export type WorkspaceMode = 'screenshots' | 'featured-graphic' | 'batch-generator';

export interface StudioProject {
  id: string;
  name: string;
  updatedAt: number;
  activePresetId: string;
  slides: SlideDesign[];
  featuredGraphicSlide: SlideDesign;
  uploadedScreenshots: UploadedScreenshot[];
  savedBackgrounds: SavedBackgroundPreset[];
}
