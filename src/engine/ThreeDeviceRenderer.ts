import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEVICE_SPECS } from '../data/devices';
import { DeviceLayer, DeviceModelId } from '../types/studio';
import { getDemoScreenCanvas } from './DemoScreenGenerator';

// Detect software WebGL per Three.js skill guidelines
export const isSoftwareGl = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
})();

/**
 * Creates a mathematically exact rounded rectangle using true circular corner arcs (absarc)
 * so phone corners have authentic flagship curvature instead of pinched quadratic curves.
 */
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.max(0.005, Math.min(radius, hw - 0.005, hh - 0.005));

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hh - r);
  shape.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-hw + r, hh);
  shape.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hh + r);
  shape.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);

  return shape;
}

function createRoundedPlaneGeometry(
  width: number,
  height: number,
  radius: number,
  curveSegments = 28
): THREE.ShapeGeometry {
  const shape = createRoundedRectShape(width, height, radius);
  const geom = new THREE.ShapeGeometry(shape, curveSegments);
  geom.computeBoundingBox();
  const pos = geom.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    uvs[i * 2] = (vx + width / 2) / width;
    uvs[i * 2 + 1] = (vy + height / 2) / height;
  }
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geom;
}

interface PooledDeviceGeometries {
  bodyGeo: THREE.BufferGeometry;
  backGlassGeo: THREE.BufferGeometry;
  bezelGeo: THREE.BufferGeometry;
  screenGeo: THREE.BufferGeometry;
  screenW: number;
  screenH: number;
}

const geometryPool = new Map<string, PooledDeviceGeometries>();

function getPooledGeometries(deviceId: DeviceModelId, isHighRes: boolean): PooledDeviceGeometries {
  const key = `${deviceId}_${isHighRes ? 'hi' : 'lo'}`;
  const cached = geometryPool.get(key);
  if (cached) return cached;

  const spec = DEVICE_SPECS[deviceId] || DEVICE_SPECS['iphone-17-pro-max'];
  const W = spec.bodyWidth;
  const H = spec.bodyHeight;
  const D = spec.bodyDepth;
  const R = spec.cornerRadius;
  const bezel = spec.bezelWidth;

  const curveSegs = isHighRes ? 36 : 24;
  const bevelSize = 0.036;
  const bevelThickness = 0.042;

  const coreW = W - bevelSize * 2;
  const coreH = H - bevelSize * 2;
  const coreR = Math.max(0.04, R - bevelSize);

  const coreShape = createRoundedRectShape(coreW, coreH, coreR);
  const extrudeDepth = Math.max(0.08, D - bevelThickness * 2);

  const bodyGeo = new THREE.ExtrudeGeometry(coreShape, {
    depth: extrudeDepth,
    bevelEnabled: true,
    bevelSegments: isHighRes ? 8 : 5,
    curveSegments: curveSegs,
    steps: 1,
    bevelSize,
    bevelThickness,
  });
  bodyGeo.translate(0, 0, -extrudeDepth / 2);

  // Concentric inset for back glass plate
  const backInset = 0.055;
  const backGlassGeo = createRoundedPlaneGeometry(
    W - backInset * 2,
    H - backInset * 2,
    Math.max(0.04, R - backInset),
    curveSegs
  );

  // Concentric inset for front ceramic-shield black glass (leaves a gleaming 0.026 metallic titanium rim around the outer edge)
  const rimLip = 0.026;
  const bezelW = W - rimLip * 2;
  const bezelH = H - rimLip * 2;
  const bezelR = Math.max(0.04, R - rimLip);
  const bezelGeo = createRoundedPlaneGeometry(bezelW, bezelH, bezelR, curveSegs);

  // Concentric inset for active OLED screen inside the black bezel
  const screenW = bezelW - bezel * 2;
  const screenH = bezelH - bezel * 2;
  const screenR = Math.max(0.03, bezelR - bezel);
  const screenGeo = createRoundedPlaneGeometry(screenW, screenH, screenR, curveSegs);

  const entry: PooledDeviceGeometries = {
    bodyGeo,
    backGlassGeo,
    bezelGeo,
    screenGeo,
    screenW,
    screenH,
  };
  geometryPool.set(key, entry);
  return entry;
}

class ThreeDeviceStudioEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private deviceGroup: THREE.Group | null = null;
  private loadedImages = new Map<string, HTMLImageElement>();
  private renderCache = new Map<string, HTMLCanvasElement>();
  private screenTexCache = new Map<string, THREE.CanvasTexture>();

  private init() {
    if (this.renderer && this.scene && this.camera) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.035).texture;
    pmremGenerator.dispose();

    // Studio 3-point + dual edge-rim lighting for realistic brushed titanium & glass highlights
    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 2.35);
    keyLight.position.set(7, 10, 11);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.45);
    fillLight.position.set(-9, 4, 8);
    scene.add(fillLight);

    const topRimLight = new THREE.DirectionalLight(0xffffff, 1.85);
    topRimLight.position.set(0, 11, -6);
    scene.add(topRimLight);

    const sideRimLeft = new THREE.DirectionalLight(0xe2e8f0, 1.5);
    sideRimLeft.position.set(-12, 1, 2);
    scene.add(sideRimLeft);

    const sideRimRight = new THREE.DirectionalLight(0xfef3c7, 1.5);
    sideRimRight.position.set(12, -1, 2);
    scene.add(sideRimRight);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  public preloadImage(url: string): Promise<HTMLImageElement> {
    if (this.loadedImages.has(url)) {
      return Promise.resolve(this.loadedImages.get(url)!);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.loadedImages.set(url, img);
        this.clearCache();
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  public getLoadedImage(url?: string): HTMLImageElement | undefined {
    if (!url) return undefined;
    return this.loadedImages.get(url);
  }

  public clearCache() {
    this.renderCache.clear();
    this.screenTexCache.forEach((t) => t.dispose());
    this.screenTexCache.clear();
  }

  private buildScreenTexture(
    layer: DeviceLayer,
    screenW: number,
    screenH: number,
    isHighRes: boolean
  ): THREE.CanvasTexture {
    const glare = layer.glareIntensity ?? 0.28;
    const texKey = [
      layer.screenshotUrl || `demo_${layer.demoScreenVariant || 0}`,
      layer.screenshotFit,
      (layer.screenshotScale || 1).toFixed(2),
      (layer.screenshotOffsetX || 0).toFixed(1),
      (layer.screenshotOffsetY || 0).toFixed(1),
      glare.toFixed(2),
      screenW.toFixed(2),
      screenH.toFixed(2),
      isHighRes ? 'hi' : 'lo',
    ].join('|');

    if (!isHighRes && this.screenTexCache.has(texKey)) {
      return this.screenTexCache.get(texKey)!;
    }

    const texW = isHighRes ? 1120 : 520;
    const texH = Math.round(texW * (screenH / screenW));
    const canvas = document.createElement('canvas');
    canvas.width = texW;
    canvas.height = texH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#070A12';
    ctx.fillRect(0, 0, texW, texH);

    const img = layer.screenshotUrl ? this.loadedImages.get(layer.screenshotUrl) : undefined;
    if (img && img.width > 0 && img.height > 0) {
      ctx.save();
      const imgAspect = img.width / img.height;
      const targetAspect = texW / texH;
      let drawW = texW;
      let drawH = texH;

      if (layer.screenshotFit === 'cover') {
        if (imgAspect > targetAspect) {
          drawH = texH;
          drawW = texH * imgAspect;
        } else {
          drawW = texW;
          drawH = texW / imgAspect;
        }
      } else if (layer.screenshotFit === 'contain') {
        if (imgAspect > targetAspect) {
          drawW = texW;
          drawH = texW / imgAspect;
        } else {
          drawH = texH;
          drawW = texH * imgAspect;
        }
      }

      const scale = layer.screenshotScale || 1;
      drawW *= scale;
      drawH *= scale;

      const offsetX = (layer.screenshotOffsetX || 0) * (texW / 100);
      const offsetY = (layer.screenshotOffsetY || 0) * (texH / 100);

      const dx = (texW - drawW) / 2 + offsetX;
      const dy = (texH - drawH) / 2 + offsetY;
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    } else {
      const demo = getDemoScreenCanvas(layer.demoScreenVariant || 0, texW, texH);
      ctx.drawImage(demo, 0, 0, texW, texH);
    }

    // Subtle Ceramic Shield / Gorilla Glass diagonal studio reflection sheen
    if (glare > 0.02) {
      ctx.save();
      const sheenGrad = ctx.createLinearGradient(0, 0, texW, texH * 0.85);
      sheenGrad.addColorStop(0, `rgba(255, 255, 255, ${glare * 0.22})`);
      sheenGrad.addColorStop(0.28, `rgba(255, 255, 255, ${glare * 0.06})`);
      sheenGrad.addColorStop(0.32, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(0.68, 'rgba(255, 255, 255, 0)');
      sheenGrad.addColorStop(1, `rgba(255, 255, 255, ${glare * 0.08})`);
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(0, 0, texW, texH);
      ctx.restore();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (this.renderer) {
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    }
    texture.needsUpdate = true;

    if (!isHighRes) {
      if (this.screenTexCache.size > 48) {
        const firstKey = this.screenTexCache.keys().next().value;
        if (firstKey) {
          this.screenTexCache.get(firstKey)?.dispose();
          this.screenTexCache.delete(firstKey);
        }
      }
      this.screenTexCache.set(texKey, texture);
    }

    return texture;
  }

  private buildDeviceMeshGroup(layer: DeviceLayer, isHighRes: boolean): THREE.Group {
    const spec = DEVICE_SPECS[layer.deviceId] || DEVICE_SPECS['iphone-17-pro-max'];
    const finish =
      spec.finishes.find((f) => f.id === layer.finishId) || spec.finishes[0];

    const isClay = Boolean(layer.isClayMaterial);
    const clayHex = layer.clayColor || layer.customFinishColor || '#E2E8F0';

    const frameHex = isClay ? clayHex : layer.customFinishColor || finish.frameHex;
    const backHex = isClay ? clayHex : layer.customFinishColor || finish.backHex;
    const accentHex = isClay ? clayHex : layer.customFinishColor || finish.accentHex;

    const group = new THREE.Group();

    const W = spec.bodyWidth;
    const H = spec.bodyHeight;
    const D = spec.bodyDepth;
    const bezel = spec.bezelWidth;

    const pooled = getPooledGeometries(spec.id, isHighRes);

    // 1. Primary 3D Extruded Chassis Body (Brushed Grade-5 Titanium / Anodized Aluminum OR Matte Clay)
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(frameHex),
      metalness: isClay ? 0.06 : finish.metalness,
      roughness: isClay ? 0.72 : finish.roughness,
      clearcoat: isClay ? 0.12 : 0.45,
      clearcoatRoughness: isClay ? 0.55 : 0.18,
      reflectivity: isClay ? 0.25 : 0.9,
    });

    const chassisMesh = new THREE.Mesh(pooled.bodyGeo, frameMat);
    group.add(chassisMesh);

    // 2. Frosted Matte Textured Back Glass Plate (-Z)
    const backGlassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(backHex),
      metalness: isClay ? 0.05 : 0.3,
      roughness: isClay ? 0.75 : 0.38,
      clearcoat: isClay ? 0.1 : 0.7,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide,
    });
    const backGlassMesh = new THREE.Mesh(pooled.backGlassGeo, backGlassMat);
    backGlassMesh.rotation.y = Math.PI;
    backGlassMesh.position.z = -D / 2 - 0.002;
    group.add(backGlassMesh);

    // 3. Deep Obsidian Front Glass Bezel (+Z)
    // Always uses a deep obsidian glass bezel so the OLED display has realistic flagship framing
    const bezelMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isClay ? '#181C24' : '#050608'),
      metalness: 0.12,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const bezelMesh = new THREE.Mesh(pooled.bezelGeo, bezelMat);
    bezelMesh.position.z = D / 2 + 0.002;
    group.add(bezelMesh);

    // 4. Active OLED Screen Mesh (+Z)
    const screenTex = this.buildScreenTexture(layer, pooled.screenW, pooled.screenH, isHighRes);
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTex,
      toneMapped: false,
    });
    const screenMesh = new THREE.Mesh(pooled.screenGeo, screenMat);
    screenMesh.position.z = D / 2 + 0.005;
    group.add(screenMesh);

    // 5. Realistic Front Camera Cutout (Dynamic Island with Optical Lens or Precision Punch-Hole)
    const cutoutMat = new THREE.MeshBasicMaterial({ color: 0x030407 });
    const lensRingMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const lensPupilMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });

    if (spec.cutoutType === 'dynamic-island') {
      const islandW = 0.76;
      const islandH = 0.21;
      const islandY = H / 2 - bezel - 0.24;
      const islandGeo = createRoundedPlaneGeometry(islandW, islandH, islandH / 2, 20);
      const islandMesh = new THREE.Mesh(islandGeo, cutoutMat);
      islandMesh.position.set(0, islandY, D / 2 + 0.009);
      group.add(islandMesh);

      // Optical FaceID & Front Camera lenses inside Dynamic Island
      const lensX = islandW / 2 - 0.11;
      const ringGeo = new THREE.CircleGeometry(0.055, 16);
      const ringMesh = new THREE.Mesh(ringGeo, lensRingMat);
      ringMesh.position.set(lensX, islandY, D / 2 + 0.011);
      group.add(ringMesh);

      const pupilGeo = new THREE.CircleGeometry(0.026, 16);
      const pupilMesh = new THREE.Mesh(pupilGeo, lensPupilMat);
      pupilMesh.position.set(lensX, islandY, D / 2 + 0.012);
      group.add(pupilMesh);

      const sensorGeo = new THREE.CircleGeometry(0.038, 16);
      const sensorMesh = new THREE.Mesh(sensorGeo, lensRingMat);
      sensorMesh.position.set(-islandW / 2 + 0.12, islandY, D / 2 + 0.011);
      group.add(sensorMesh);
    } else {
      const holeRadius = spec.cutoutType === 'punch-hole-small' ? 0.068 : 0.082;
      const holeY = H / 2 - bezel - 0.21;
      const holeGeo = new THREE.CircleGeometry(holeRadius, 24);
      const holeMesh = new THREE.Mesh(holeGeo, cutoutMat);
      holeMesh.position.set(0, holeY, D / 2 + 0.009);
      group.add(holeMesh);

      const pupilGeo = new THREE.CircleGeometry(holeRadius * 0.42, 16);
      const pupilMesh = new THREE.Mesh(pupilGeo, lensPupilMat);
      pupilMesh.position.set(0, holeY, D / 2 + 0.011);
      group.add(pupilMesh);
    }

    // Top earpiece micro-slit on the upper bezel edge
    const speakerSlitGeo = createRoundedPlaneGeometry(0.46, 0.018, 0.009, 8);
    const speakerSlitMesh = new THREE.Mesh(speakerSlitGeo, lensRingMat);
    speakerSlitMesh.position.set(0, H / 2 - 0.038, D / 2 + 0.006);
    group.add(speakerSlitMesh);

    // 6. Clean, Ultra-Low-Profile Single-Side Pill Buttons (Never sticking out on both sides!)
    if (layer.showHardwareButtons !== false) {
      const buttonMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(accentHex),
        metalness: isClay ? 0.06 : 0.94,
        roughness: isClay ? 0.72 : 0.16,
        clearcoat: isClay ? 0.1 : 0.5,
      });

      // Place sleek, nearly-flush capsule buttons only on the primary visible rail (right rail by default,
      // or left rail when rotated to show the left side), preventing buttons from ever jutting out on both sides.
      const activeSide: 'left' | 'right' = layer.rotationY > 12 ? 'left' : 'right';

      const addSleekPillButton = (
        side: 'left' | 'right',
        yCenter: number,
        length: number,
        protrusion = 0.009,
        thickness = 0.075
      ) => {
        const pillShape = createRoundedRectShape(thickness, length, thickness / 2);
        const btnGeo = new THREE.ExtrudeGeometry(pillShape, {
          depth: protrusion,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.005,
          bevelThickness: 0.005,
        });
        btnGeo.rotateY(side === 'right' ? Math.PI / 2 : -Math.PI / 2);
        const btnMesh = new THREE.Mesh(btnGeo, buttonMat);
        const xPos = side === 'left' ? -W / 2 + 0.002 : W / 2 - 0.002;
        btnMesh.position.set(xPos, yCenter, 0);
        group.add(btnMesh);
      };

      if (spec.buttonLayout === 'iphone-16-17') {
        if (activeSide === 'left') {
          addSleekPillButton('left', H * 0.25, 0.24, 0.008);
          addSleekPillButton('left', H * 0.14, 0.48, 0.008);
          addSleekPillButton('left', H * 0.03, 0.48, 0.008);
        } else {
          addSleekPillButton('right', H * 0.14, 0.68, 0.009);
        }
      } else if (spec.buttonLayout === 'galaxy') {
        addSleekPillButton('right', H * 0.18, 0.82, 0.009);
        addSleekPillButton('right', H * 0.03, 0.42, 0.009);
      } else {
        addSleekPillButton('right', H * 0.18, 0.42, 0.009);
        addSleekPillButton('right', H * 0.03, 0.80, 0.009);
      }
    }

    // 7. Bottom USB-C Port & Speaker Micro-Grilles (visible when tilted on X-axis)
    const portMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const usbcGeo = createRoundedPlaneGeometry(0.32, 0.075, 0.037, 12);
    usbcGeo.rotateX(Math.PI / 2);
    const usbcMesh = new THREE.Mesh(usbcGeo, portMat);
    usbcMesh.position.set(0, -H / 2 - 0.002, 0);
    group.add(usbcMesh);

    for (let i = 1; i <= 4; i++) {
      const dotGeo = new THREE.CircleGeometry(0.018, 8);
      dotGeo.rotateX(Math.PI / 2);
      const dotL = new THREE.Mesh(dotGeo, portMat);
      dotL.position.set(-0.28 - i * 0.07, -H / 2 - 0.002, 0);
      group.add(dotL);

      const dotR = new THREE.Mesh(dotGeo, portMat);
      dotR.position.set(0.28 + i * 0.07, -H / 2 - 0.002, 0);
      group.add(dotR);
    }

    // 8. Rear Camera Bump if rotated past 50 deg on Y or X
    if (Math.abs(layer.rotationY) > 50 || Math.abs(layer.rotationX) > 50) {
      this.addRearCameraAssembly(
        group,
        spec.cameraBumpType,
        W,
        H,
        D,
        frameMat,
        backGlassMat,
        accentHex
      );
    }

    return group;
  }

  private addRearCameraAssembly(
    group: THREE.Group,
    bumpType: string,
    W: number,
    H: number,
    D: number,
    frameMat: THREE.MeshPhysicalMaterial,
    backMat: THREE.MeshPhysicalMaterial,
    accentHex: string
  ) {
    const lensGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x070a12,
      metalness: 0.15,
      roughness: 0.05,
      clearcoat: 1.0,
    });
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(accentHex),
      metalness: 0.9,
      roughness: 0.18,
    });

    const addCameraLens = (x: number, y: number, zBase: number, radius = 0.28, depth = 0.08) => {
      const ringGeo = new THREE.CylinderGeometry(radius, radius, depth, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x, y, zBase - depth / 2);
      group.add(ringMesh);

      const glassGeo = new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, depth + 0.01, 20);
      glassGeo.rotateX(Math.PI / 2);
      const glassMesh = new THREE.Mesh(glassGeo, lensGlassMat);
      glassMesh.position.set(x, y, zBase - depth / 2 - 0.005);
      group.add(glassMesh);
    };

    const zBack = -D / 2;

    if (bumpType === 'iphone-pro-triple') {
      const platW = 1.48;
      const platH = 1.52;
      const platDepth = 0.07;
      const platShape = createRoundedRectShape(platW, platH, 0.36);
      const platGeo = new THREE.ExtrudeGeometry(platShape, {
        depth: platDepth,
        bevelEnabled: true,
        bevelSize: 0.02,
        bevelThickness: 0.02,
        bevelSegments: 3,
      });
      const platMesh = new THREE.Mesh(platGeo, backMat);
      const cx = W / 2 - platW / 2 - 0.22;
      const cy = H / 2 - platH / 2 - 0.22;
      platMesh.position.set(cx, cy, zBack - platDepth);
      group.add(platMesh);

      addCameraLens(cx + 0.34, cy + 0.36, zBack - platDepth, 0.27, 0.08);
      addCameraLens(cx + 0.34, cy - 0.36, zBack - platDepth, 0.27, 0.08);
      addCameraLens(cx - 0.32, cy, zBack - platDepth, 0.27, 0.08);
    } else if (bumpType === 'pixel-visor-pro' || bumpType === 'pixel-visor-dual') {
      const visorW = W - 0.42;
      const visorH = 0.82;
      const visorDepth = 0.1;
      const visorShape = createRoundedRectShape(visorW, visorH, visorH / 2);
      const visorGeo = new THREE.ExtrudeGeometry(visorShape, {
        depth: visorDepth,
        bevelEnabled: true,
        bevelSize: 0.025,
        bevelThickness: 0.025,
        bevelSegments: 3,
      });
      const visorMesh = new THREE.Mesh(visorGeo, frameMat);
      const cy = H / 2 - 0.92;
      visorMesh.position.set(0, cy, zBack - visorDepth);
      group.add(visorMesh);
    } else {
      const cx = W / 2 - 0.56;
      const topY = H / 2 - 0.56;
      addCameraLens(cx, topY, zBack, 0.26, 0.08);
      addCameraLens(cx, topY - 0.64, zBack, 0.26, 0.08);
    }
  }

  public renderDeviceLayerToCanvas(
    layer: DeviceLayer,
    pixelSize: number,
    isHighResExport = false
  ): HTMLCanvasElement {
    this.init();
    const renderer = this.renderer!;
    const scene = this.scene!;
    const camera = this.camera!;

    // Quantize preview pixelSize to nearest 32px bucket so thumbnails & zoom reuse cached 3D renders
    const clampedSize = isHighResExport
      ? Math.max(256, Math.min(2400, Math.round(pixelSize)))
      : Math.max(160, Math.min(860, Math.round(pixelSize / 32) * 32));

    const cacheKey = [
      layer.deviceId,
      layer.finishId,
      layer.customFinishColor || '',
      layer.isClayMaterial ? `clay_${layer.clayColor || ''}` : 'metal',
      layer.rotationX.toFixed(1),
      layer.rotationY.toFixed(1),
      layer.rotationZ.toFixed(1),
      (layer.fov || 34).toFixed(0),
      (layer.glareIntensity ?? 0.28).toFixed(2),
      layer.screenshotUrl || `demo_${layer.demoScreenVariant}`,
      layer.screenshotFit,
      (layer.screenshotScale || 1).toFixed(2),
      (layer.screenshotOffsetX || 0).toFixed(1),
      (layer.screenshotOffsetY || 0).toFixed(1),
      layer.showHardwareButtons !== false ? '1' : '0',
      clampedSize,
      isHighResExport ? 'hi' : 'lo',
    ].join('|');

    if (!isHighResExport && this.renderCache.has(cacheKey)) {
      return this.renderCache.get(cacheKey)!;
    }

    if (this.deviceGroup) {
      scene.remove(this.deviceGroup);
    }

    const group = this.buildDeviceMeshGroup(layer, isHighResExport);

    const rx = THREE.MathUtils.degToRad(layer.rotationX || 0);
    const ry = THREE.MathUtils.degToRad(layer.rotationY || 0);
    const rz = THREE.MathUtils.degToRad(layer.rotationZ || 0);
    group.rotation.set(rx, ry, rz, 'YXZ');

    scene.add(group);
    this.deviceGroup = group;

    const fov = THREE.MathUtils.clamp(layer.fov || 34, 18, 65);
    camera.fov = fov;
    camera.aspect = 1;
    const refTan = Math.tan(THREE.MathUtils.degToRad(34 / 2));
    const curTan = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const dist = 14.0 * (refTan / curTan);
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(1);
    renderer.setSize(clampedSize, clampedSize, false);
    renderer.render(scene, camera);

    const outCanvas = document.createElement('canvas');
    outCanvas.width = clampedSize;
    outCanvas.height = clampedSize;
    const outCtx = outCanvas.getContext('2d')!;
    outCtx.drawImage(renderer.domElement, 0, 0);

    if (!isHighResExport) {
      if (this.renderCache.size > 220) {
        const oldestKey = this.renderCache.keys().next().value;
        if (oldestKey) this.renderCache.delete(oldestKey);
      }
      this.renderCache.set(cacheKey, outCanvas);
    }

    return outCanvas;
  }
}

export const threeDeviceEngine = new ThreeDeviceStudioEngine();
