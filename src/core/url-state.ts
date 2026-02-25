import { computeMaxIterations } from "./mandelbrot-math";
import type { ViewerState } from "./types";

export const DEFAULT_STATE: ViewerState = {
  centerX: -0.5,
  centerY: 0,
  zoom: 1,
  maxIterations: 100,
};

export function encodeStateToParams(state: ViewerState): string {
  const params = new URLSearchParams();
  params.set("x", state.centerX.toPrecision(8));
  params.set("y", state.centerY.toPrecision(8));
  params.set("z", state.zoom.toPrecision(6));
  return params.toString();
}

export function decodeStateFromParams(search: string): ViewerState | null {
  const params = new URLSearchParams(search);
  const xStr = params.get("x");
  const yStr = params.get("y");
  const zStr = params.get("z");

  if (xStr == null || yStr == null || zStr == null) return null;

  const centerX = Number(xStr);
  const centerY = Number(yStr);
  const zoom = Number(zStr);

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) return null;
  if (!Number.isFinite(zoom) || zoom <= 0) return null;

  return {
    centerX,
    centerY,
    zoom,
    maxIterations: computeMaxIterations(zoom),
  };
}
