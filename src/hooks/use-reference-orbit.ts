import { useEffect, useRef, useState } from "react";
import { computeReferenceOrbitWithSA } from "@/core/reference-orbit";
import type {
  ViewerState,
  Viewport,
  ReferenceOrbitWithSA,
} from "@/core/types";
import { computeScale } from "@/core/mandelbrot-math";

const PERTURBATION_ZOOM_THRESHOLD = 1e6;

export function useReferenceOrbit(
  state: ViewerState,
  viewportRef: React.MutableRefObject<Viewport>
): ReferenceOrbitWithSA | null {
  const [result, setResult] = useState<ReferenceOrbitWithSA | null>(null);
  const cacheKeyRef = useRef("");

  useEffect(() => {
    if (state.zoom < PERTURBATION_ZOOM_THRESHOLD) {
      cacheKeyRef.current = "";
      setResult(null);
      return;
    }

    const centerReStr = state.centerXStr ?? String(state.centerX);
    const centerImStr = state.centerYStr ?? String(state.centerY);
    const cacheKey = `${centerReStr}:${centerImStr}:${state.maxIterations}`;

    if (cacheKey === cacheKeyRef.current) return;
    cacheKeyRef.current = cacheKey;

    const viewport = viewportRef.current;
    const scale = computeScale(state.zoom, viewport);
    const viewportRadius =
      (scale *
        Math.sqrt(
          viewport.width * viewport.width + viewport.height * viewport.height
        )) /
      2;

    const newResult = computeReferenceOrbitWithSA({
      centerReStr,
      centerImStr,
      maxIterations: state.maxIterations,
      zoom: state.zoom,
      viewportRadius,
    });
    setResult(newResult);
  }, [state, viewportRef]);

  return result;
}
