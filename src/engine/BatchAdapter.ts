import JSZip from 'jszip';
import { DEVICE_SPECS } from '../data/devices';
import {
  CanvasLayer,
  DeviceLayer,
  DeviceModelId,
  ExportPreset,
  SlideDesign,
  TextLayer,
} from '../types/studio';
import { exportSlideAtExactResolution } from './CompositionRenderer';

export interface BatchGeneratedItem {
  id: string;
  preset: ExportPreset;
  deviceId: DeviceModelId;
  slideIndex: number;
  slide: SlideDesign;
  isCustomized: boolean;
}

/**
 * Intelligently adapts a source SlideDesign to a target DeviceModelId and target ExportPreset
 * without stretching or distorting. Repositions and scales 3D phones, headlines, and callout cards
 * according to aspect ratio delta and device physical proportions.
 */
export function adaptSlideForBatchTarget(
  sourceSlide: SlideDesign,
  targetDeviceId: DeviceModelId,
  targetPreset: ExportPreset,
  sourceAspect = 1320 / 2868 // default 9:19.5 reference
): SlideDesign {
  const targetAspect = targetPreset.width / targetPreset.height;
  // Ratio > 1 means target is wider/shorter than 9:19.5 (e.g., 9:16 Google Play is ~1.22x wider per unit height)
  const aspectDelta = targetAspect / sourceAspect;
  const spec = DEVICE_SPECS[targetDeviceId] || DEVICE_SPECS['iphone-17-pro-max'];
  const defaultFinish = spec.finishes[0]?.id || 'natural-titanium';

  const clonedLayers: CanvasLayer[] = JSON.parse(JSON.stringify(sourceSlide.layers));

  const adaptedLayers = clonedLayers.map((layer) => {
    if (layer.type === 'device') {
      const devLayer = layer as DeviceLayer;
      devLayer.deviceId = targetDeviceId;
      devLayer.finishId = defaultFinish;

      // Adapt scale & vertical position for wider 9:16 vs taller 9:19.5 canvases
      if (aspectDelta > 1.08) {
        // Wider canvas (e.g. 9:16 Play Store): slightly compact device scale so top/bottom text has breathing room
        devLayer.scale = Number((devLayer.scale * 0.93).toFixed(3));
        if (devLayer.y > 550) {
          devLayer.y = Math.min(900, Math.round(devLayer.y + 14));
        } else if (devLayer.y < 450) {
          devLayer.y = Math.max(120, Math.round(devLayer.y - 14));
        }
      } else if (aspectDelta < 0.94) {
        // Taller canvas: slightly boost device presence
        devLayer.scale = Number((devLayer.scale * 1.04).toFixed(3));
      }
      return devLayer;
    }

    if (layer.type === 'text') {
      const txtLayer = layer as TextLayer;
      if (aspectDelta > 1.08) {
        // On shorter/wider 9:16 canvases, slightly tighten headline font size & vertical spacing
        txtLayer.fontSize = Math.max(12, Math.round(txtLayer.fontSize * 0.92));
        txtLayer.width = Math.min(920, Math.round(txtLayer.width * 0.96));
        if (txtLayer.y < 350) {
          txtLayer.y = Math.max(65, Math.round(txtLayer.y * 0.93));
        } else if (txtLayer.y > 700) {
          txtLayer.y = Math.min(940, Math.round(1000 - (1000 - txtLayer.y) * 0.92));
        }
      }
      return txtLayer;
    }

    return layer;
  });

  return {
    id: `${sourceSlide.id}_batch_${targetPreset.id}_${targetDeviceId}`,
    name: `${sourceSlide.name} (${spec.shortName})`,
    background: JSON.parse(JSON.stringify(sourceSlide.background)),
    layers: adaptedLayers,
  };
}

/**
 * Generates a complete ZIP archive containing high-resolution exports for all batch items
 * (plus optional Featured Graphic), reporting progress via callback.
 */
export async function exportBatchToZip(
  items: BatchGeneratedItem[],
  format: 'png' | 'jpeg',
  jpegQuality: number,
  includeFeaturedGraphic?: SlideDesign,
  onProgress?: (completed: number, total: number, currentLabel: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const totalCount = items.length + (includeFeaturedGraphic ? 1 : 0);
  let completed = 0;

  for (const item of items) {
    const spec = DEVICE_SPECS[item.deviceId];
    const folderName = `${item.preset.store === 'apple' ? 'Apple_App_Store' : 'Google_Play_Store'}_${item.preset.width}x${item.preset.height}_${spec.shortName.replace(/\s+/g, '_')}`;
    const safeSlideName = item.slide.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${String(item.slideIndex + 1).padStart(2, '0')}_${safeSlideName}.${ext}`;

    onProgress?.(
      completed,
      totalCount,
      `Rendering ${spec.shortName} (${item.preset.width}×${item.preset.height}) — Slide ${item.slideIndex + 1}`
    );

    // Yield briefly so UI progress bar updates smoothly
    await new Promise((r) => setTimeout(r, 15));

    const blob = await exportSlideAtExactResolution(
      item.slide,
      item.preset.width,
      item.preset.height,
      format,
      jpegQuality
    );

    zip.folder(folderName)?.file(fileName, blob);
    completed++;
  }

  if (includeFeaturedGraphic) {
    onProgress?.(completed, totalCount, 'Rendering Google Play Featured Graphic (1024×500)');
    await new Promise((r) => setTimeout(r, 15));
    const fgBlob = await exportSlideAtExactResolution(
      includeFeaturedGraphic,
      1024,
      500,
      format,
      jpegQuality
    );
    zip.folder('Google_Play_Featured_Graphic_1024x500')?.file(`featured_graphic_1024x500.${ext}`, fgBlob);
    completed++;
  }

  onProgress?.(totalCount, totalCount, 'Compressing high-resolution ZIP archive...');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
