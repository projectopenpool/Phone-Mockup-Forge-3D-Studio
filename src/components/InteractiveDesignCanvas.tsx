import React, { useEffect, useRef, useState } from 'react';
import { Move, Rotate3d, Lock, Copy, Trash2 } from 'lucide-react';
import { LayerBounds, renderSlideComposition } from '../engine/CompositionRenderer';
import { CanvasLayer, DeviceLayer, SlideDesign } from '../types/studio';

interface InteractiveDesignCanvasProps {
  slide: SlideDesign;
  aspectWidth: number;
  aspectHeight: number;
  zoom: number;
  selectedLayerIds: string[];
  onSelectLayers: (ids: string[]) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CanvasLayer) => CanvasLayer, recordHistory?: boolean) => void;
  onCommitHistory: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onDropScreenshotOnDevice?: (deviceId: string, screenshotUrl: string) => void;
}

export const InteractiveDesignCanvas: React.FC<InteractiveDesignCanvasProps> = ({
  slide,
  aspectWidth,
  aspectHeight,
  zoom,
  selectedLayerIds,
  onSelectLayers,
  onUpdateLayer,
  onCommitHistory,
  onDuplicateSelected,
  onDeleteSelected,
  onDropScreenshotOnDevice,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boundsRef = useRef<LayerBounds[]>([]);
  const [interactionMode, setInteractionMode] = useState<'move' | 'orbit3d'>('move');
  const [snapGuides, setSnapGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  const [dragState, setDragState] = useState<{
    type: 'move' | 'scale' | 'orbit3d';
    layerId: string;
    startClientX: number;
    startClientY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    initialWidth: number;
    initialHeight: number;
    initialRotX: number;
    initialRotY: number;
  } | null>(null);

  // Logical preview resolution (keeps preview crisp and fast while separate from full export resolution)
  const isLandscape = aspectWidth > aspectHeight;
  const baseRenderWidth = isLandscape ? 920 : 580;
  const baseRenderHeight = Math.round(baseRenderWidth * (aspectHeight / aspectWidth));

  // Display CSS dimensions scaled by zoom — tuned so 100% zoom fits comfortably in the central stage
  const displayWidth = Math.round((isLandscape ? 680 : 310) * zoom);
  const displayHeight = Math.round(displayWidth * (aspectHeight / aspectWidth));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const raf = requestAnimationFrame(() => {
      const bounds = renderSlideComposition(
        ctx,
        slide,
        baseRenderWidth,
        baseRenderHeight,
        false,
        false
      );
      boundsRef.current = bounds;

      // Draw active magnetic alignment guides if dragging
      if (snapGuides.vertical !== undefined || snapGuides.horizontal !== undefined) {
        ctx.save();
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        if (snapGuides.vertical !== undefined) {
          const vx = (snapGuides.vertical / 1000) * baseRenderWidth;
          ctx.beginPath();
          ctx.moveTo(vx, 0);
          ctx.lineTo(vx, baseRenderHeight);
          ctx.stroke();
        }
        if (snapGuides.horizontal !== undefined) {
          const hy = (snapGuides.horizontal / 1000) * baseRenderHeight;
          ctx.beginPath();
          ctx.moveTo(0, hy);
          ctx.lineTo(baseRenderWidth, hy);
          ctx.stroke();
        }
        ctx.restore();
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [slide, baseRenderWidth, baseRenderHeight, snapGuides]);

  const clientToNormalized = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { nx: 500, ny: 500 };
    const rect = canvas.getBoundingClientRect();
    const nx = ((clientX - rect.left) / rect.width) * 1000;
    const ny = ((clientY - rect.top) / rect.height) * 1000;
    return { nx, ny };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { nx, ny } = clientToNormalized(e.clientX, e.clientY);

    const orderedBounds = [...boundsRef.current].reverse();
    let hitLayerId: string | null = null;

    for (const b of orderedBounds) {
      const layer = slide.layers.find((l) => l.id === b.id);
      if (!layer || !layer.visible) continue;
      const halfW = b.width / 2;
      const halfH = b.height / 2;
      if (nx >= b.x - halfW && nx <= b.x + halfW && ny >= b.y - halfH && ny <= b.y + halfH) {
        hitLayerId = b.id;
        break;
      }
    }

    if (!hitLayerId) {
      onSelectLayers([]);
      return;
    }

    const hitLayer = slide.layers.find((l) => l.id === hitLayerId);
    if (!hitLayer) return;

    if (e.shiftKey) {
      if (selectedLayerIds.includes(hitLayerId)) {
        onSelectLayers(selectedLayerIds.filter((id) => id !== hitLayerId));
      } else {
        onSelectLayers([...selectedLayerIds, hitLayerId]);
      }
    } else if (!selectedLayerIds.includes(hitLayerId)) {
      onSelectLayers([hitLayerId]);
    }

    if (hitLayer.locked) return;

    const is3DOrbit =
      hitLayer.type === 'device' && (interactionMode === 'orbit3d' || e.altKey);

    setDragState({
      type: is3DOrbit ? 'orbit3d' : 'move',
      layerId: hitLayer.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialX: hitLayer.x,
      initialY: hitLayer.y,
      initialScale: hitLayer.type === 'device' ? hitLayer.scale : 1,
      initialWidth: hitLayer.type !== 'device' ? hitLayer.width : 400,
      initialHeight: hitLayer.type === 'shape' ? hitLayer.height : 200,
      initialRotX: hitLayer.type === 'device' ? hitLayer.rotationX : 0,
      initialRotY: hitLayer.type === 'device' ? hitLayer.rotationY : 0,
    });

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const dxNorm = ((e.clientX - dragState.startClientX) / rect.width) * 1000;
    const dyNorm = ((e.clientY - dragState.startClientY) / rect.height) * 1000;

    if (dragState.type === 'move') {
      let nextX = Math.round(dragState.initialX + dxNorm);
      let nextY = Math.round(dragState.initialY + dyNorm);
      const guides: { vertical?: number; horizontal?: number } = {};

      if (Math.abs(nextX - 500) < 12) {
        nextX = 500;
        guides.vertical = 500;
      }
      if (Math.abs(nextY - 500) < 12) {
        nextY = 500;
        guides.horizontal = 500;
      }

      for (const other of slide.layers) {
        if (other.id === dragState.layerId || !other.visible) continue;
        if (Math.abs(nextX - other.x) < 10) {
          nextX = other.x;
          guides.vertical = other.x;
        }
        if (Math.abs(nextY - other.y) < 10) {
          nextY = other.y;
          guides.horizontal = other.y;
        }
      }

      setSnapGuides(guides);
      onUpdateLayer(
        dragState.layerId,
        (l) => ({
          ...l,
          x: nextX,
          y: nextY,
        }),
        false
      );
    } else if (dragState.type === 'orbit3d') {
      const dRotY = ((e.clientX - dragState.startClientX) / rect.width) * 110;
      const dRotX = ((e.clientY - dragState.startClientY) / rect.height) * 90;
      onUpdateLayer(
        dragState.layerId,
        (l) => {
          if (l.type !== 'device') return l;
          return {
            ...l,
            rotationY: Number(Math.max(-75, Math.min(75, dragState.initialRotY + dRotY)).toFixed(1)),
            rotationX: Number(Math.max(-65, Math.min(65, dragState.initialRotX + dRotX)).toFixed(1)),
          };
        },
        false
      );
    } else if (dragState.type === 'scale') {
      const scaleDelta = (dxNorm + dyNorm) / 500;
      onUpdateLayer(
        dragState.layerId,
        (l) => {
          if (l.type === 'device') {
            return {
              ...l,
              scale: Number(Math.max(0.25, Math.min(1.75, dragState.initialScale + scaleDelta)).toFixed(3)),
            };
          }
          if (l.type === 'shape') {
            return {
              ...l,
              width: Math.max(40, Math.round(dragState.initialWidth + dxNorm * 1.5)),
              height: Math.max(30, Math.round(dragState.initialHeight + dyNorm * 1.5)),
            };
          }
          return {
            ...l,
            width: Math.max(150, Math.min(960, Math.round(dragState.initialWidth + dxNorm * 1.5))),
          };
        },
        false
      );
    }
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
      setSnapGuides({});
      onCommitHistory();
    }
  };

  const primarySelectedId = selectedLayerIds[0];
  const primaryLayer = slide.layers.find((l) => l.id === primarySelectedId);
  const primaryBounds = boundsRef.current.find((b) => b.id === primarySelectedId);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const screenshotUrl = e.dataTransfer.getData('text/plain');
    if (!screenshotUrl || !onDropScreenshotOnDevice) return;

    const { nx, ny } = clientToNormalized(e.clientX, e.clientY);
    const orderedDevices = [...slide.layers]
      .filter((l): l is DeviceLayer => l.type === 'device' && l.visible)
      .sort((a, b) => b.zIndex - a.zIndex);

    for (const dev of orderedDevices) {
      const b = boundsRef.current.find((bnd) => bnd.id === dev.id);
      if (b) {
        if (
          nx >= b.x - b.width / 2 &&
          nx <= b.x + b.width / 2 &&
          ny >= b.y - b.height / 2 &&
          ny <= b.y + b.height / 2
        ) {
          onDropScreenshotOnDevice(dev.id, screenshotUrl);
          return;
        }
      }
    }

    if (orderedDevices[0]) {
      onDropScreenshotOnDevice(orderedDevices[0].id, screenshotUrl);
    }
  };

  return (
    <div
      className="relative select-none flex items-center justify-center"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Crisp Studio Artboard Container */}
      <div
        className="relative rounded-2xl overflow-visible shadow-[0_24px_60px_-15px_rgba(15,23,42,0.28)] dark:shadow-[0_28px_70px_-15px_rgba(0,0,0,0.75)] ring-1 ring-slate-900/12 dark:ring-white/15 bg-white dark:bg-slate-950 transition-shadow"
        style={{ width: displayWidth, height: displayHeight }}
      >
        <canvas
          ref={canvasRef}
          width={baseRenderWidth}
          height={baseRenderHeight}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full block rounded-2xl ${
            interactionMode === 'orbit3d' && primaryLayer?.type === 'device'
              ? 'cursor-grab active:cursor-grabbing'
              : 'cursor-move'
          }`}
        />

        {/* Selection Bounding Box & Interactive Handles Overlay */}
        {primaryLayer && primaryBounds && primaryLayer.visible && (
          <div
            className="pointer-events-none absolute border-2 border-indigo-500 rounded-lg shadow-[0_0_0_1px_rgba(255,255,255,0.6)]"
            style={{
              left: `${((primaryBounds.x - primaryBounds.width / 2) / 1000) * 100}%`,
              top: `${((primaryBounds.y - primaryBounds.height / 2) / 1000) * 100}%`,
              width: `${(primaryBounds.width / 1000) * 100}%`,
              height: `${(primaryBounds.height / 1000) * 100}%`,
            }}
          >
            {/* Bottom-right Scale Handle */}
            {!primaryLayer.locked && (
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDragState({
                    type: 'scale',
                    layerId: primaryLayer.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    initialX: primaryLayer.x,
                    initialY: primaryLayer.y,
                    initialScale: primaryLayer.type === 'device' ? primaryLayer.scale : 1,
                    initialWidth: primaryLayer.type !== 'device' ? primaryLayer.width : 400,
                    initialHeight: primaryLayer.type === 'shape' ? primaryLayer.height : 200,
                    initialRotX: primaryLayer.type === 'device' ? primaryLayer.rotationX : 0,
                    initialRotY: primaryLayer.type === 'device' ? primaryLayer.rotationY : 0,
                  });
                }}
                title="Drag to resize / scale"
                className="pointer-events-auto absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-white border-2 border-indigo-600 shadow cursor-nwse-resize hover:scale-125 transition-transform"
              />
            )}

            {/* Floating Context Toolbar above Selected Element */}
            <div className="pointer-events-auto absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700/80 shadow-lg text-xs text-slate-800 dark:text-slate-100 whitespace-nowrap z-20">
              <span className="font-bold text-indigo-600 dark:text-indigo-300 px-1.5 max-w-[120px] truncate">
                {primaryLayer.name}
              </span>
              {primaryLayer.locked && <Lock className="w-3.5 h-3.5 text-amber-500 mx-1" />}

              {primaryLayer.type === 'device' && !primaryLayer.locked && (
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded p-0.5 ml-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInteractionMode('move');
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      interactionMode === 'move'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Move className="w-3 h-3" />
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInteractionMode('orbit3d');
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      interactionMode === 'orbit3d'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Rotate3d className="w-3 h-3" />
                    3D Tilt
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateSelected();
                }}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                title="Duplicate Layer (Ctrl+D)"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSelected();
                }}
                className="p-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition-colors"
                title="Delete Layer (Del)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
