import { useEffect, useRef, useState } from "react";
import {
  createReferenceOrbitClient,
  type ReferenceOrbitClient,
} from "@/core/reference-orbit-client";
import type { ViewerState, Viewport, ReferenceOrbitWithSA } from "@/core/types";
import { computeScale } from "@/core/mandelbrot-math";

const PERTURBATION_ZOOM_THRESHOLD = 1e6;

interface CachedReferenceOrbit {
  cacheKey: string;
  value: ReferenceOrbitWithSA;
}

export function useReferenceOrbit(
  state: ViewerState,
  viewportRef: React.MutableRefObject<Viewport>
): ReferenceOrbitWithSA | null {
  const [result, setResult] = useState<CachedReferenceOrbit | null>(null);
  const clientRef = useRef<ReferenceOrbitClient | null>(null);
  const cacheKeyRef = useRef("");
  const requestIdRef = useRef(0);
  const centerReStr = state.centerXStr ?? String(state.centerX);
  const centerImStr = state.centerYStr ?? String(state.centerY);
  const cacheKey = `${centerReStr}:${centerImStr}:${state.maxIterations}`;

  useEffect(() => {
    clientRef.current = createReferenceOrbitClient();
    return () => {
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (state.zoom < PERTURBATION_ZOOM_THRESHOLD) {
      cacheKeyRef.current = "";
      requestIdRef.current++;
      return;
    }

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

    const currentRequestId = ++requestIdRef.current;

    clientRef.current
      ?.compute({
        centerReStr,
        centerImStr,
        maxIterations: state.maxIterations,
        zoom: state.zoom,
        viewportRadius,
      })
      .then((newResult) => {
        if (currentRequestId !== requestIdRef.current) return;
        setResult({ cacheKey, value: newResult });
      })
      .catch((err) => {
        if (currentRequestId !== requestIdRef.current) return;
        console.error("Reference orbit computation failed:", err);
      });
  }, [state, viewportRef, cacheKey, centerReStr, centerImStr]);

  if (state.zoom < PERTURBATION_ZOOM_THRESHOLD || result?.cacheKey !== cacheKey) {
    return null;
  }

  return result.value;
}
