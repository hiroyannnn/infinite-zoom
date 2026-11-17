import Decimal from "decimal.js";
import { requiredPrecision } from "./arbitrary-precision";
import type { ViewerState, Viewport, PixelPoint, ComplexPoint } from "./types";

const INITIAL_RANGE_Y = 3;
const NUMBER_EXPONENT_SPAN =
  Math.ceil(Math.log10(Number.MAX_VALUE)) -
  Math.floor(Math.log10(Number.MIN_VALUE));

interface ShiftedCoordinate {
  value: number;
  precise?: string;
}

function shiftCoordinate(
  value: number,
  precise: string | undefined,
  delta: number,
  zoom: number
): ShiftedCoordinate {
  if (precise === undefined) return { value: value + delta };
  if (delta === 0) return { value, precise };

  const current = new Decimal(precise);
  const change = new Decimal(delta);
  const highestExponent = Math.max(current.e, change.e);
  const lowestExponent = Math.min(
    current.e - current.precision() + 1,
    change.e - change.precision() + 1
  );
  const digitsWithCarry = highestExponent - lowestExponent + 2;
  // URL exponents may exceed Number's range; do not expand their entire gap.
  const precisionBudget =
    Math.max(requiredPrecision(zoom), current.precision(), change.precision()) +
    NUMBER_EXPONENT_SPAN;
  Decimal.set({
    precision: Math.min(
      Math.max(requiredPrecision(zoom), digitsWithCarry),
      precisionBudget
    ),
  });

  const shifted = current.plus(change);
  return { value: shifted.toNumber(), precise: shifted.toString() };
}

function shiftCenter(
  state: ViewerState,
  deltaX: number,
  deltaY: number,
  zoom: number
): Pick<ViewerState, "centerX" | "centerY"> &
  Partial<Pick<ViewerState, "centerXStr" | "centerYStr">> {
  const centerX = shiftCoordinate(
    state.centerX,
    state.centerXStr,
    deltaX,
    zoom
  );
  const centerY = shiftCoordinate(
    state.centerY,
    state.centerYStr,
    deltaY,
    zoom
  );

  return {
    centerX: centerX.value,
    centerY: centerY.value,
    ...(centerX.precise === undefined ? {} : { centerXStr: centerX.precise }),
    ...(centerY.precise === undefined ? {} : { centerYStr: centerY.precise }),
  };
}

export function computeScale(zoom: number, viewport: Viewport): number {
  return INITIAL_RANGE_Y / (zoom * viewport.height);
}

export function pixelToComplex(
  pixel: PixelPoint,
  state: ViewerState,
  viewport: Viewport
): ComplexPoint {
  const scale = computeScale(state.zoom, viewport);
  return {
    re: state.centerX + (pixel.x - viewport.width * 0.5) * scale,
    im: state.centerY - (pixel.y - viewport.height * 0.5) * scale,
  };
}

export function complexToPixel(
  complex: ComplexPoint,
  state: ViewerState,
  viewport: Viewport
): PixelPoint {
  const scale = computeScale(state.zoom, viewport);
  return {
    x: (complex.re - state.centerX) / scale + viewport.width * 0.5,
    y: -(complex.im - state.centerY) / scale + viewport.height * 0.5,
  };
}

export function zoomAtPoint(
  state: ViewerState,
  pixel: PixelPoint,
  viewport: Viewport,
  zoomFactor: number
): ViewerState {
  const newZoom = state.zoom * zoomFactor;
  const scale = computeScale(state.zoom, viewport);
  const newScale = computeScale(newZoom, viewport);
  const offsetX = pixel.x - viewport.width * 0.5;
  const offsetY = pixel.y - viewport.height * 0.5;

  return {
    ...state,
    ...shiftCenter(
      state,
      offsetX * (scale - newScale),
      offsetY * (newScale - scale),
      newZoom
    ),
    zoom: newZoom,
  };
}

export function panByPixelDelta(
  state: ViewerState,
  deltaX: number,
  deltaY: number,
  viewport: Viewport
): ViewerState {
  const scale = computeScale(state.zoom, viewport);
  return {
    ...state,
    ...shiftCenter(state, -deltaX * scale, deltaY * scale, state.zoom),
  };
}

export function computeMaxIterations(zoom: number): number {
  return Math.max(50, Math.floor(100 + 50 * Math.log2(Math.max(1, zoom))));
}

export function splitDoubleSingle(value: number): { hi: number; lo: number } {
  const hi = Math.fround(value);
  const lo = value - hi;
  return { hi, lo };
}
