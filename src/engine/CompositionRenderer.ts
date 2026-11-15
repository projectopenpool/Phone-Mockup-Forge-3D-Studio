import {
  BackgroundConfig,
  CanvasLayer,
  DeviceLayer,
  ShapeLayer,
  SlideDesign,
  TextLayer,
} from '../types/studio';
import { getDemoScreenCanvas } from './DemoScreenGenerator';
import { threeDeviceEngine } from './ThreeDeviceRenderer';

export interface LayerBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

/**
 * Renders the background (solid, linear-gradient, radial-gradient, mesh-gradient, 3d-clay-backdrop, image,
 * plus continuous multi-slide panoramic flows).
 */
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalAlpha = bg.opacity ?? 1;

  if (bg.brightness !== undefined && bg.brightness !== 100) {
    ctx.filter = `brightness(${bg.brightness}%)`;
  }

  const stops =
    bg.gradientStops && bg.gradientStops.length > 0
      ? [...bg.gradientStops].sort((a, b) => a.position - b.position)
      : [
          { id: '1', color: '#1E1B4B', position: 0 },
          { id: '2', color: '#312E81', position: 100 },
        ];

  if (bg.type === 'solid') {
    ctx.fillStyle = bg.solidColor || '#F8FAFC';
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === '3d-clay-backdrop') {
    // Tactile matte 3D clay studio room backdrop with soft studio floor lighting and volumetric clay spheres
    const baseColor = bg.solidColor || stops[0]?.color || '#F3EFEA';
    const secondaryColor = stops[1]?.color || '#E5DEC9';
    const accentClay = stops[2]?.color || '#D97757';

    const roomGrad = ctx.createLinearGradient(0, 0, width, height);
    roomGrad.addColorStop(0, baseColor);
    roomGrad.addColorStop(0.65, secondaryColor);
    roomGrad.addColorStop(1, baseColor);
    ctx.fillStyle = roomGrad;
    ctx.fillRect(0, 0, width, height);

    // Curved 3D studio cyclorama floor horizon
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, height * 0.72);
    ctx.quadraticCurveTo(width * 0.5, height * 0.67, width, height * 0.73);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const floorGrad = ctx.createLinearGradient(0, height * 0.68, 0, height);
    floorGrad.addColorStop(0, 'rgba(0,0,0,0.05)');
    floorGrad.addColorStop(0.3, 'rgba(255,255,255,0.25)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.08)');
    ctx.fillStyle = floorGrad;
    ctx.fill();
    ctx.restore();

    // Render soft 3D clay spheres in the studio backdrop
    draw3DClaySphere(ctx, width * 0.16, height * 0.24, width * 0.16, accentClay);
    draw3DClaySphere(ctx, width * 0.86, height * 0.42, width * 0.21, secondaryColor);
    draw3DClaySphere(ctx, width * 0.22, height * 0.82, width * 0.12, secondaryColor);
  } else if (bg.type === 'linear-gradient') {
    const angleRad = ((bg.gradientAngle ?? 135) - 90) * (Math.PI / 180);
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.sqrt(width * width + height * height) / 2;
    const x0 = cx - Math.cos(angleRad) * r;
    const y0 = cy - Math.sin(angleRad) * r;
    const x1 = cx + Math.cos(angleRad) * r;
    const y1 = cy + Math.sin(angleRad) * r;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const st of stops) {
      grad.addColorStop(Math.max(0, Math.min(1, st.position / 100)), st.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'radial-gradient') {
    const cx = width / 2;
    const cy = height * 0.42;
    const maxR = Math.max(width, height) * 0.85;
    const grad = ctx.createRadialGradient(cx, cy, maxR * 0.04, cx, cy, maxR);
    for (const st of stops) {
      grad.addColorStop(Math.max(0, Math.min(1, st.position / 100)), st.color);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (bg.type === 'mesh-gradient') {
    ctx.fillStyle = stops[0]?.color || '#0F172A';
    ctx.fillRect(0, 0, width, height);

    const meshPoints = [
      { x: width * 0.18, y: height * 0.18, color: stops[0]?.color || '#4F46E5' },
      { x: width * 0.85, y: height * 0.25, color: stops[1]?.color || '#EC4899' },
      { x: width * 0.25, y: height * 0.82, color: stops[2]?.color || stops[1]?.color || '#06B6D4' },
      { x: width * 0.8, y: height * 0.85, color: stops[3]?.color || stops[0]?.color || '#8B5CF6' },
    ];
    for (const mp of meshPoints) {
      const r = Math.max(width, height) * 0.72;
      const g = ctx.createRadialGradient(mp.x, mp.y, 0, mp.x, mp.y, r);
      g.addColorStop(0, mp.color + 'CC');
      g.addColorStop(1, mp.color + '00');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }
  } else if (bg.type === 'image') {
    ctx.fillStyle = bg.solidColor || '#0F172A';
    ctx.fillRect(0, 0, width, height);
    const img = bg.imageUrl ? threeDeviceEngine.getLoadedImage(bg.imageUrl) : undefined;
    if (img && img.width > 0) {
      ctx.save();
      const filters: string[] = [];
      if (bg.brightness !== undefined && bg.brightness !== 100) {
        filters.push(`brightness(${bg.brightness}%)`);
      }
      if (bg.blur && bg.blur > 0) {
        filters.push(`blur(${bg.blur * (width / 1000)}px)`);
      }
      if (filters.length > 0) ctx.filter = filters.join(' ');

      const imgAspect = img.width / img.height;
      const canvasAspect = width / height;
      let drawW = width;
      let drawH = height;

      if (bg.imageFit === 'contain') {
        if (imgAspect > canvasAspect) {
          drawW = width;
          drawH = width / imgAspect;
        } else {
          drawH = height;
          drawW = height * imgAspect;
        }
      } else if (bg.imageFit !== 'fill') {
        if (imgAspect > canvasAspect) {
          drawH = height;
          drawW = height * imgAspect;
        } else {
          drawW = width;
          drawH = width / imgAspect;
        }
      }

      const scale = bg.imageScale || 1;
      drawW *= scale;
      drawH *= scale;

      const ox = (bg.imageOffsetX || 0) * (width / 100);
      const oy = (bg.imageOffsetY || 0) * (height / 100);
      ctx.drawImage(img, (width - drawW) / 2 + ox, (height - drawH) / 2 + oy, drawW, drawH);
      ctx.restore();
    }
  }

  // Render Seamless Continuity Flow across slides if configured
  if (bg.continuityType && bg.continuityType !== 'none') {
    renderContinuityFlowOverlay(ctx, bg, width, height);
  }

  // Render subtle architectural/geometric pattern if enabled
  if (bg.pattern && bg.pattern !== 'none' && (bg.patternOpacity ?? 0.12) > 0) {
    renderBackgroundPattern(ctx, bg, width, height);
  }

  ctx.restore();
}

/**
 * Draws a realistic matte 3D clay sphere with top-left warm studio highlight and soft ambient shadow
 */
function draw3DClaySphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  baseHex: string
) {
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
  ctx.shadowBlur = radius * 0.45;
  ctx.shadowOffsetX = radius * 0.12;
  ctx.shadowOffsetY = radius * 0.22;

  const grad = ctx.createRadialGradient(
    cx - radius * 0.32,
    cy - radius * 0.32,
    radius * 0.06,
    cx,
    cy,
    radius
  );
  grad.addColorStop(0, '#FFFFFF');
  grad.addColorStop(0.28, baseHex);
  grad.addColorStop(0.85, baseHex);
  grad.addColorStop(1, 'rgba(15,23,42,0.22)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders mathematically continuous panoramic background flows across slides (0..totalSlides-1).
 * At x=width of slide i, globalX = (i + 1) / N, which equals x=0 of slide i+1!
 */
function renderContinuityFlowOverlay(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  width: number,
  height: number
) {
  const slideIdx = bg.continuitySlideIndex ?? 0;
  const totalSlides = Math.max(1, bg.continuityTotalSlides ?? 5);
  const accent1 = bg.continuityAccent || '#6366F1';
  const accent2 = bg.continuitySecondary || '#EC4899';

  ctx.save();

  if (bg.continuityType === 'aurora-wave') {
    // 2 overlapping continuous sinusoidal silk waves spanning all slides
    for (let waveLayer = 0; waveLayer < 2; waveLayer++) {
      ctx.beginPath();
      const steps = 48;
      for (let s = 0; s <= steps; s++) {
        const localT = s / steps;
        const globalT = (slideIdx + localT) / totalSlides;
        const px = localT * width;
        const py =
          height * (waveLayer === 0 ? 0.54 : 0.64) +
          Math.sin(globalT * Math.PI * 3.5 + waveLayer * 1.1) * (height * 0.13) +
          Math.cos(globalT * Math.PI * 2.0) * (height * 0.06);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, height * 0.35, 0, height);
      grad.addColorStop(0, (waveLayer === 0 ? accent1 : accent2) + '66');
      grad.addColorStop(1, (waveLayer === 0 ? accent2 : accent1) + '14');
      ctx.fillStyle = grad;
      ctx.fill();

      // Luminous top ridge stroke
      ctx.strokeStyle = (waveLayer === 0 ? accent1 : accent2) + 'AA';
      ctx.lineWidth = Math.max(2, (width / 1000) * 4);
      ctx.stroke();
    }
  } else if (bg.continuityType === 'clay-hills') {
    // Rolling 3D clay hills that connect across every slide boundary + clay sun/orbs
    for (let hill = 0; hill < 2; hill++) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = width * 0.05;
      ctx.shadowOffsetY = -height * 0.01;

      ctx.beginPath();
      const steps = 40;
      for (let s = 0; s <= steps; s++) {
        const localT = s / steps;
        const globalT = (slideIdx + localT) / totalSlides;
        const px = localT * width;
        const py =
          height * (hill === 0 ? 0.62 : 0.76) +
          Math.sin(globalT * Math.PI * 3.0 + hill * 1.8) * (height * 0.09);
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      const hillGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
      hillGrad.addColorStop(0, hill === 0 ? accent1 : accent2);
      hillGrad.addColorStop(1, hill === 0 ? accent2 : accent1);
      ctx.fillStyle = hillGrad;
      ctx.fill();
      ctx.restore();
    }

    // Continuous boundary clay spheres that sit right on slide seams (e.g. x = width on slide i and x = 0 on slide i+1)
    draw3DClaySphere(ctx, width, height * 0.36, width * 0.18, accent1);
    if (slideIdx > 0) {
      draw3DClaySphere(ctx, 0, height * 0.36, width * 0.18, accent1);
    }
  } else if (bg.continuityType === 'archway') {
    // Connected giant geometric rings and stadium arches spanning slide seams
    ctx.strokeStyle = accent1 + '40';
    ctx.lineWidth = Math.max(3, (width / 1000) * 28);

    // Seam circle on right edge (connects with left edge of next slide)
    ctx.beginPath();
    ctx.arc(width, height * 0.52, width * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    // Seam circle on left edge (connects with right edge of previous slide)
    ctx.beginPath();
    ctx.arc(0, height * 0.52, width * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    // Continuous horizontal horizon band
    ctx.fillStyle = accent2 + '22';
    ctx.fillRect(0, height * 0.48, width, height * 0.08);
  } else if (bg.continuityType === 'diagonal-stripe') {
    // Continuous kinetic diagonal ribbon spanning across the 5-slide panorama
    const totalW = width * totalSlides;
    const offsetX = -slideIdx * width;

    ctx.save();
    ctx.translate(offsetX, 0);

    const stripeGrad = ctx.createLinearGradient(0, height * 0.2, totalW, height * 0.85);
    stripeGrad.addColorStop(0, accent1 + '55');
    stripeGrad.addColorStop(0.5, accent2 + '66');
    stripeGrad.addColorStop(1, accent1 + '55');
    ctx.fillStyle = stripeGrad;

    ctx.beginPath();
    ctx.moveTo(0, height * 0.68);
    ctx.lineTo(totalW, height * 0.24);
    ctx.lineTo(totalW, height * 0.48);
    ctx.lineTo(0, height * 0.92);
    ctx.closePath();
    ctx.fill();

    // Second parallel accent ribbon
    ctx.fillStyle = accent2 + '33';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.42);
    ctx.lineTo(totalW, height * 0.78);
    ctx.lineTo(totalW, height * 0.89);
    ctx.lineTo(0, height * 0.53);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  } else if (bg.continuityType === 'blueprint-line') {
    // Connected Swiss blueprint timeline track + continuous bezier wave
    ctx.strokeStyle = accent1 + '55';
    ctx.lineWidth = Math.max(2, (width / 1000) * 5);

    // Continuous horizontal datum line at 32% and 78% height
    ctx.beginPath();
    ctx.moveTo(0, height * 0.31);
    ctx.lineTo(width, height * 0.31);
    ctx.moveTo(0, height * 0.82);
    ctx.lineTo(width, height * 0.82);
    ctx.stroke();

    // Continuous smooth curve connecting slides
    ctx.beginPath();
    for (let s = 0; s <= 40; s++) {
      const localT = s / 40;
      const globalT = (slideIdx + localT) / totalSlides;
      const px = localT * width;
      const py = height * 0.58 + Math.sin(globalT * Math.PI * 4) * (height * 0.14);
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = accent2 + '88';
    ctx.lineWidth = Math.max(3, (width / 1000) * 7);
    ctx.stroke();
  }

  ctx.restore();
}

function renderBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  bg: BackgroundConfig,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalAlpha = bg.patternOpacity ?? 0.12;
  const color = bg.patternColor || '#FFFFFF';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const baseStep = Math.max(24, (bg.patternScale || 48) * (width / 1000));

  if (bg.pattern === 'dots') {
    const r = Math.max(1.2, baseStep * 0.06);
    for (let x = baseStep / 2; x < width; x += baseStep) {
      for (let y = baseStep / 2; y < height; y += baseStep) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (bg.pattern === 'grid') {
    ctx.lineWidth = Math.max(1, width / 1000);
    ctx.beginPath();
    for (let x = 0; x <= width; x += baseStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += baseStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (bg.pattern === 'iso-grid') {
    ctx.lineWidth = Math.max(1, width / 1000);
    ctx.beginPath();
    const diag = Math.max(width, height) * 2;
    for (let offset = -diag; offset <= diag; offset += baseStep) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + height, height);
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - height, height);
    }
    ctx.stroke();
  } else if (bg.pattern === 'diagonal') {
    ctx.lineWidth = Math.max(1.2, (width / 1000) * 1.5);
    ctx.beginPath();
    const diag = width + height;
    for (let offset = -height; offset <= diag; offset += baseStep) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset - height, height);
    }
    ctx.stroke();
  } else if (bg.pattern === 'crosshair') {
    ctx.lineWidth = Math.max(1, width / 1000);
    const arm = baseStep * 0.16;
    ctx.beginPath();
    for (let x = baseStep / 2; x < width; x += baseStep) {
      for (let y = baseStep / 2; y < height; y += baseStep) {
        ctx.moveTo(x - arm, y);
        ctx.lineTo(x + arm, y);
        ctx.moveTo(x, y - arm);
        ctx.lineTo(x, y + arm);
      }
    }
    ctx.stroke();
  } else if (bg.pattern === 'radial-rings') {
    ctx.lineWidth = Math.max(1.2, (width / 1000) * 1.5);
    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.hypot(width, height);
    for (let r = baseStep; r < maxR; r += baseStep * 1.4) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (bg.pattern === 'waves') {
    ctx.lineWidth = Math.max(1.5, (width / 1000) * 1.6);
    for (let y = baseStep / 2; y < height + baseStep; y += baseStep) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 16) {
        const wy = y + Math.sin((x / baseStep) * Math.PI) * (baseStep * 0.22);
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

function renderShapeLayer(
  ctx: CanvasRenderingContext2D,
  layer: ShapeLayer,
  width: number,
  height: number
): LayerBounds {
  const cx = (layer.x / 1000) * width;
  const cy = (layer.y / 1000) * height;
  const w = (layer.width / 1000) * width;
  const h = (layer.height / 1000) * height;

  if (layer.shapeKind === 'clay-sphere') {
    draw3DClaySphere(ctx, cx, cy, Math.min(w, h) / 2, layer.fill || '#F472B6');
    return {
      id: layer.id,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation || 0,
    };
  }

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  ctx.translate(cx, cy);
  if (layer.rotation) {
    ctx.rotate((layer.rotation * Math.PI) / 180);
  }

  if (layer.blur && layer.blur > 0) {
    ctx.filter = `blur(${layer.blur * (width / 1000)}px)`;
  }

  if (layer.shadowEnabled || layer.shapeKind === 'clay-card') {
    ctx.shadowColor =
      layer.shapeKind === 'clay-card'
        ? 'rgba(15, 23, 42, 0.16)'
        : layer.shadowColor || 'rgba(0,0,0,0.35)';
    ctx.shadowBlur =
      (layer.shapeKind === 'clay-card' ? 36 : layer.shadowBlur ?? 24) * (width / 1000);
    ctx.shadowOffsetY =
      (layer.shapeKind === 'clay-card' ? 16 : layer.shadowOffsetY ?? 10) * (height / 1000);
  }

  let fillStyle: string | CanvasGradient = layer.fill || '#6366F1';
  if (layer.shapeKind === 'clay-card') {
    const cg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    cg.addColorStop(0, '#FFFFFF');
    cg.addColorStop(0.25, layer.fill || '#F8FAFC');
    cg.addColorStop(1, layer.fillGradientColor2 || layer.fill || '#E2E8F0');
    fillStyle = cg;
  } else if (layer.fillGradientEnabled && layer.fillGradientColor2) {
    const rad = ((layer.fillGradientAngle ?? 135) - 90) * (Math.PI / 180);
    const r = Math.hypot(w, h) / 2;
    const g = ctx.createLinearGradient(
      -Math.cos(rad) * r,
      -Math.sin(rad) * r,
      Math.cos(rad) * r,
      Math.sin(rad) * r
    );
    g.addColorStop(0, layer.fill || '#6366F1');
    g.addColorStop(1, layer.fillGradientColor2);
    fillStyle = g;
  }

  ctx.fillStyle = fillStyle;

  if (layer.shapeKind === 'glow-orb') {
    const r = Math.max(w, h) / 2;
    const orbGrad = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r);
    orbGrad.addColorStop(0, layer.fill || '#6366F1');
    orbGrad.addColorStop(0.5, (layer.fillGradientColor2 || layer.fill || '#6366F1') + '66');
    orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  } else if (layer.shapeKind === 'circle') {
    const r = Math.min(w, h) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke || '#FFFFFF';
      ctx.lineWidth = layer.strokeWidth * (width / 1000);
      ctx.stroke();
    }
  } else if (layer.shapeKind === 'star') {
    const outerR = Math.min(w, h) / 2;
    const innerR = outerR * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    const r =
      layer.shapeKind === 'pill'
        ? Math.min(w, h) / 2
        : Math.min(w / 2, h / 2, (layer.cornerRadius ?? 28) * (width / 1000));
    drawRoundedPath(ctx, -w / 2, -h / 2, w, h, r);
    ctx.fill();

    if (layer.strokeWidth > 0 || layer.shapeKind === 'clay-card') {
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle =
        layer.shapeKind === 'clay-card'
          ? 'rgba(255,255,255,0.75)'
          : layer.stroke || 'rgba(255,255,255,0.22)';
      ctx.lineWidth = Math.max(1.5, (layer.strokeWidth || 2) * (width / 1000));
      ctx.stroke();
    }

    if (layer.imageUrl) {
      const img = threeDeviceEngine.getLoadedImage(layer.imageUrl);
      if (img && img.width > 0) {
        ctx.save();
        drawRoundedPath(ctx, -w / 2, -h / 2, w, h, r);
        ctx.clip();
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }

    if (layer.label) {
      ctx.shadowColor = 'transparent';
      ctx.fillStyle =
        layer.textColor || (layer.shapeKind === 'clay-card' ? '#0F172A' : '#FFFFFF');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(10, Math.min(h * (layer.sublabel ? 0.3 : 0.42), width * 0.042));
      ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      if (layer.sublabel) {
        ctx.fillText(layer.label, 0, -h * 0.12);
        ctx.globalAlpha = (layer.opacity ?? 1) * 0.78;
        ctx.font = `500 ${fontSize * 0.74}px "DM Sans", sans-serif`;
        ctx.fillText(layer.sublabel, 0, h * 0.18);
      } else {
        ctx.fillText(layer.label, 0, 1);
      }
    }
  }

  ctx.restore();

  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation || 0,
  };
}

/**
 * Ultra-fast 2D/Faux-3D Device Renderer used strictly for small sidebar thumbnails (`width <= 200`)
 * so browsing 120+ templates in the sidebar never triggers 120 WebGL draw calls at once.
 */
function renderFastThumbnailDeviceLayer(
  ctx: CanvasRenderingContext2D,
  layer: DeviceLayer,
  width: number,
  height: number
): LayerBounds {
  const cx = (layer.x / 1000) * width;
  const cy = (layer.y / 1000) * height;
  const baseDim = Math.max(width, height);
  const drawSize = baseDim * (layer.scale || 0.78);

  const phoneW = drawSize * 0.38;
  const phoneH = drawSize * 0.78;
  const r = phoneW * 0.16;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((layer.rotationZ || 0) * Math.PI) / 180);

  // Subtle 2.5D perspective skew based on rotationY & rotationX
  const skewX = Math.max(-0.28, Math.min(0.28, (layer.rotationY || 0) / 110));
  const scaleX = Math.max(0.65, Math.cos(((layer.rotationY || 0) * Math.PI) / 180));
  const scaleY = Math.max(0.75, Math.cos(((layer.rotationX || 0) * Math.PI) / 180));
  ctx.transform(scaleX, -skewX * 0.25, skewX * 0.12, scaleY, 0, 0);

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = width * 0.04;
  ctx.shadowOffsetY = height * 0.015;

  // 3D Side depth extrusion offset
  const depthOffset = -(layer.rotationY || 0) * (width / 1000) * 0.85;
  ctx.fillStyle = layer.isClayMaterial
    ? layer.clayColor || '#E2E8F0'
    : layer.customFinishColor || '#64748B';
  drawRoundedPath(ctx, -phoneW / 2 + depthOffset, -phoneH / 2 + 2, phoneW, phoneH, r);
  ctx.fill();

  // Front Bezel
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = layer.isClayMaterial ? layer.clayColor || '#F1F5F9' : '#0B0F19';
  drawRoundedPath(ctx, -phoneW / 2, -phoneH / 2, phoneW, phoneH, r);
  ctx.fill();

  // Screen content
  const bezel = phoneW * 0.045;
  const sw = phoneW - bezel * 2;
  const sh = phoneH - bezel * 2;
  const sr = Math.max(2, r - bezel);
  ctx.save();
  drawRoundedPath(ctx, -sw / 2, -sh / 2, sw, sh, sr);
  ctx.clip();

  const img = layer.screenshotUrl ? threeDeviceEngine.getLoadedImage(layer.screenshotUrl) : undefined;
  if (img && img.width > 0) {
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  } else {
    const demo = getDemoScreenCanvas(layer.demoScreenVariant || 0, 180, 390);
    ctx.drawImage(demo, -sw / 2, -sh / 2, sw, sh);
  }
  ctx.restore();

  // Dynamic Island pill
  ctx.fillStyle = '#030712';
  drawRoundedPath(ctx, -phoneW * 0.14, -phoneH / 2 + bezel * 1.8, phoneW * 0.28, phoneH * 0.025, 99);
  ctx.fill();

  ctx.restore();

  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: Math.min(720, layer.scale * 460),
    height: Math.min(920, layer.scale * 760),
    rotation: layer.rotationZ || 0,
  };
}

function renderDeviceLayer(
  ctx: CanvasRenderingContext2D,
  layer: DeviceLayer,
  width: number,
  height: number,
  isHighResExport: boolean,
  _fastThumbnail = false
): LayerBounds {
  const cx = (layer.x / 1000) * width;
  const cy = (layer.y / 1000) * height;
  const baseDim = Math.max(width, height);
  const drawSize = baseDim * (layer.scale || 0.78);

  const threeCanvas = threeDeviceEngine.renderDeviceLayerToCanvas(
    layer,
    drawSize,
    isHighResExport
  );

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;

  if (layer.contactShadow3D) {
    ctx.save();
    const shadowW = drawSize * 0.42;
    const shadowH = drawSize * 0.07;
    const sx = cx + ((layer.shadowOffsetX ?? 0) / 1000) * width;
    const sy = cy + drawSize * 0.34 + ((layer.shadowOffsetY ?? 15) / 1000) * height;
    ctx.translate(sx, sy);
    ctx.scale(1, shadowH / shadowW);
    const cGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowW);
    cGrad.addColorStop(0, `rgba(0,0,0,${layer.shadowOpacity ?? 0.48})`);
    cGrad.addColorStop(0.55, `rgba(0,0,0,${(layer.shadowOpacity ?? 0.48) * 0.35})`);
    cGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.arc(0, 0, shadowW, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || `rgba(0,0,0,${layer.shadowOpacity ?? 0.45})`;
    ctx.shadowBlur = (layer.shadowBlur ?? 45) * (width / 1000);
    ctx.shadowOffsetX = ((layer.shadowOffsetX ?? 0) / 1000) * width;
    ctx.shadowOffsetY = ((layer.shadowOffsetY ?? 24) / 1000) * height;
  }

  ctx.drawImage(threeCanvas, cx - drawSize / 2, cy - drawSize / 2, drawSize, drawSize);
  ctx.restore();

  const normW = Math.min(720, layer.scale * 460);
  const normH = Math.min(920, layer.scale * 760);

  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: normW,
    height: normH,
    rotation: layer.rotationZ || 0,
  };
}

function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  width: number,
  height: number
): LayerBounds {
  const cx = (layer.x / 1000) * width;
  const cy = (layer.y / 1000) * height;
  const refScale = Math.min(width, height) / 1000;
  const fontScale = width < height ? width / 620 : height / 500;
  const pxSize = Math.max(8, layer.fontSize * fontScale);
  const maxWrapW = (layer.width / 1000) * width;

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  ctx.translate(cx, cy);
  if (layer.rotation) {
    ctx.rotate((layer.rotation * Math.PI) / 180);
  }

  const fontStyle = layer.fontStyle || 'normal';
  const fontWeight = layer.fontWeight || 700;
  const fontFamily = layer.fontFamily || 'Plus Jakarta Sans';
  ctx.font = `${fontStyle} ${fontWeight} ${pxSize}px "${fontFamily}", sans-serif`;
  ctx.textBaseline = 'middle';

  if ('letterSpacing' in ctx) {
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${(layer.letterSpacing || 0) * refScale}px`;
  }

  const rawParagraphs = (layer.text || '').split('\n');
  const lines: string[] = [];

  for (const para of rawParagraphs) {
    const words = para.split(' ');
    let currentLine = '';
    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWrapW && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
  }

  const lineHeightPx = pxSize * (layer.lineHeight || 1.16);
  const totalTextH = lines.length * lineHeightPx;

  let maxLineW = 0;
  for (const l of lines) {
    const m = ctx.measureText(l);
    if (m.width > maxLineW) maxLineW = m.width;
  }

  if (layer.bgEnabled) {
    ctx.save();
    const padX = (layer.bgPaddingX ?? 24) * fontScale;
    const padY = (layer.bgPaddingY ?? 12) * fontScale;
    const boxW = maxLineW + padX * 2;
    const boxH = totalTextH + padY * 2;
    const r = Math.min(boxW / 2, boxH / 2, (layer.bgRadius ?? 18) * fontScale);

    let boxX = -boxW / 2;
    if (layer.align === 'left') boxX = -maxWrapW / 2 - padX;
    if (layer.align === 'right') boxX = maxWrapW / 2 - maxLineW - padX;

    ctx.globalAlpha = (layer.opacity ?? 1) * (layer.bgOpacity ?? 0.9);
    ctx.fillStyle = layer.bgColor || '#1E293B';
    drawRoundedPath(ctx, boxX, -totalTextH / 2 - padY, boxW, boxH, r);
    ctx.fill();
    ctx.restore();
  }

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = (layer.shadowBlur ?? 18) * fontScale;
    ctx.shadowOffsetX = (layer.shadowOffsetX ?? 0) * fontScale;
    ctx.shadowOffsetY = (layer.shadowOffsetY ?? 6) * fontScale;
  }

  if (layer.gradientEnabled && layer.gradientColor2) {
    const angleRad = ((layer.gradientAngle ?? 90) * Math.PI) / 180;
    const rx = (Math.cos(angleRad) * maxLineW) / 2;
    const ry = (Math.sin(angleRad) * totalTextH) / 2;
    const grad = ctx.createLinearGradient(-rx, -ry, rx, ry);
    grad.addColorStop(0, layer.color || '#FFFFFF');
    grad.addColorStop(1, layer.gradientColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = layer.color || '#FFFFFF';
  }

  ctx.textAlign = layer.align || 'center';
  let anchorX = 0;
  if (layer.align === 'left') anchorX = -maxWrapW / 2;
  if (layer.align === 'right') anchorX = maxWrapW / 2;

  const startY = -totalTextH / 2 + lineHeightPx / 2;

  lines.forEach((line, idx) => {
    const ly = startY + idx * lineHeightPx;
    if (layer.outlineEnabled && layer.outlineWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = layer.outlineColor || '#000000';
      ctx.lineWidth = layer.outlineWidth * fontScale;
      ctx.lineJoin = 'round';
      ctx.strokeText(line, anchorX, ly);
      ctx.restore();
    }
    ctx.fillText(line, anchorX, ly);
  });

  ctx.restore();

  const normW = Math.max(
    120,
    Math.min(960, (Math.max(maxLineW, maxWrapW * 0.6) / width) * 1000 + 30)
  );
  const normH = Math.max(45, (totalTextH / height) * 1000 + 24);

  return {
    id: layer.id,
    x: layer.x,
    y: layer.y,
    width: normW,
    height: normH,
    rotation: layer.rotation || 0,
  };
}

function drawRoundedPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function renderSlideComposition(
  ctx: CanvasRenderingContext2D,
  slide: SlideDesign,
  targetWidth: number,
  targetHeight: number,
  isHighResExport = false,
  fastThumbnail = false
): LayerBounds[] {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.clearRect(0, 0, targetWidth, targetHeight);

  // 1. Render Background
  renderBackground(ctx, slide.background, targetWidth, targetHeight);

  // 2. Sort visible layers by zIndex ascending
  const orderedLayers = [...slide.layers]
    .filter((l) => l.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  const boundsList: LayerBounds[] = [];

  for (const layer of orderedLayers) {
    if (layer.type === 'shape') {
      boundsList.push(renderShapeLayer(ctx, layer, targetWidth, targetHeight));
    } else if (layer.type === 'device') {
      boundsList.push(
        renderDeviceLayer(
          ctx,
          layer,
          targetWidth,
          targetHeight,
          isHighResExport,
          fastThumbnail
        )
      );
    } else if (layer.type === 'text') {
      boundsList.push(renderTextLayer(ctx, layer, targetWidth, targetHeight));
    }
  }

  ctx.restore();
  return boundsList;
}

export async function exportSlideAtExactResolution(
  slide: SlideDesign,
  exportWidth: number,
  exportHeight: number,
  format: 'png' | 'jpeg' = 'png',
  jpegQuality = 0.95
): Promise<Blob> {
  const urlsToPreload: string[] = [];
  if (slide.background.imageUrl) urlsToPreload.push(slide.background.imageUrl);
  for (const l of slide.layers) {
    if (l.type === 'device' && l.screenshotUrl) urlsToPreload.push(l.screenshotUrl);
    if (l.type === 'shape' && l.imageUrl) urlsToPreload.push(l.imageUrl);
  }
  await Promise.allSettled(urlsToPreload.map((u) => threeDeviceEngine.preloadImage(u)));

  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const ctx = exportCanvas.getContext('2d')!;

  renderSlideComposition(ctx, slide, exportWidth, exportHeight, true, false);

  return new Promise<Blob>((resolve, reject) => {
    exportCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode high-resolution export image.'));
      },
      format === 'jpeg' ? 'image/jpeg' : 'image/png',
      format === 'jpeg' ? jpegQuality : undefined
    );
  });
}
