import { useEffect, useRef, useState } from "react";
import {
  createReferenceOrbitClient,
  type ReferenceOrbitClient,
} from "@/core/reference-orbit-client";
import type { ViewerState, Viewport, ReferenceOrbitWithSA } from "@/core/types";
import { computeScale } from "@/core/mandelbrot-math";

const PERTURBATION_ZOOM_THRESHOLD = 1e6;

export function useReferenceOrbit(
  state: ViewerState,
  viewportRef: React.MutableRefObject<Viewport>
): ReferenceOrbitWithSA | null {
  const [result, setResult] = useState<ReferenceOrbitWithSA | null>(null);
  const clientRef = useRef<ReferenceOrbitClient | null>(null);
  const cacheKeyRef = useRef("");
  const requestIdRef = useRef(0);

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
        // Discard stale results
        if (currentRequestId !== requestIdRef.current) return;
        setResult(newResult);
      })
      .catch((err) => {
        if (currentRequestId !== requestIdRef.current) return;
        console.error("Reference orbit computation failed:", err);
      });
  }, [state, viewportRef]);

  return result;
}
