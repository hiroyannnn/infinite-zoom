import { useEffect, useRef, useState } from "react";
import { computeReferenceOrbit } from "@/core/reference-orbit";
import type { ViewerState, ReferenceOrbit } from "@/core/types";

const PERTURBATION_ZOOM_THRESHOLD = 1e6;

export function useReferenceOrbit(
  state: ViewerState
): ReferenceOrbit | null {
  const [orbit, setOrbit] = useState<ReferenceOrbit | null>(null);
  const cacheKeyRef = useRef("");

  useEffect(() => {
    if (state.zoom < PERTURBATION_ZOOM_THRESHOLD) {
      if (orbit !== null) setOrbit(null);
      return;
    }

    const centerReStr = state.centerXStr ?? String(state.centerX);
    const centerImStr = state.centerYStr ?? String(state.centerY);
    const cacheKey = `${centerReStr}:${centerImStr}:${state.maxIterations}`;

    if (cacheKey === cacheKeyRef.current) return;
    cacheKeyRef.current = cacheKey;

    const newOrbit = computeReferenceOrbit({
      centerReStr,
      centerImStr,
      maxIterations: state.maxIterations,
      zoom: state.zoom,
    });
    setOrbit(newOrbit);
  }, [state, orbit]);

  return orbit;
}
