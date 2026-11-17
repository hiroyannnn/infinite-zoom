import Decimal from "decimal.js";
import { computeMaxIterations } from "./mandelbrot-math";
import { PRECISION_ZOOM_THRESHOLD } from "./arbitrary-precision";
import type { ViewerState } from "./types";

export const DEFAULT_STATE: ViewerState = {
  centerX: -0.5,
  centerY: 0,
  zoom: 1,
  maxIterations: 100,
};

function normalizePrecisionCoordinate(value: string, parsed: number): string {
  const normalized = value.trim();
  if (normalized === "") return parsed.toString();

  try {
    new Decimal(normalized);
    return normalized;
  } catch {
    return parsed.toPrecision(17);
  }
}

export function encodeStateToParams(state: ViewerState): string {
  const params = new URLSearchParams();
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

  if (
    zoom >= PRECISION_ZOOM_THRESHOLD ||
    xStr.length > 10 ||
    yStr.length > 10
  ) {
    state.centerXStr = normalizePrecisionCoordinate(xStr, centerX);
    state.centerYStr = normalizePrecisionCoordinate(yStr, centerY);
  }

  return state;
}
