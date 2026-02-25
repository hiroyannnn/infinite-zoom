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
  // Use precision strings if available (deep zoom)
  params.set("x", state.centerXStr ?? state.centerX.toPrecision(8));
  params.set("y", state.centerYStr ?? state.centerY.toPrecision(8));
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

  const state: ViewerState = {
    centerX,
    centerY,
    zoom,
    maxIterations: computeMaxIterations(zoom),
  };

  // Preserve precision strings for deep zoom coordinates
  if (xStr.length > 10 || yStr.length > 10) {
    state.centerXStr = xStr;
    state.centerYStr = yStr;
  }

  return state;
}
