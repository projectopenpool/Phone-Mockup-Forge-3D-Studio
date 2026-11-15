import React, { useEffect, useRef, useState } from 'react';
import { renderSlideComposition } from '../engine/CompositionRenderer';
import { SlideDesign } from '../types/studio';

interface SlidePreviewCanvasProps {
  slide: SlideDesign;
  width: number;
  height: number;
  className?: string;
  useFastThumbnail?: boolean;
}

export const SlidePreviewCanvas: React.FC<SlidePreviewCanvasProps> = ({
  slide,
  width,
  height,
  className = '',
  useFastThumbnail,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Lazy visibility check so offscreen template thumbnails never block mount
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '180px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fastMode = useFastThumbnail !== undefined ? useFastThumbnail : width <= 220;

    const raf = requestAnimationFrame(() => {
      renderSlideComposition(ctx, slide, width, height, false, fastMode);
    });
    return () => cancelAnimationFrame(raf);
  }, [isVisible, slide, width, height, useFastThumbnail]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
};
