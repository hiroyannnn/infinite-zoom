import type { ViewerState, Viewport, PixelPoint, ComplexPoint } from "./types";

const INITIAL_RANGE_Y = 3;

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
  const complexAtCursor = pixelToComplex(pixel, state, viewport);
  const newZoom = state.zoom * zoomFactor;
  const newScale = computeScale(newZoom, viewport);

  const newCenterX =
    complexAtCursor.re - (pixel.x - viewport.width * 0.5) * newScale;
  const newCenterY =
    complexAtCursor.im + (pixel.y - viewport.height * 0.5) * newScale;

  return {
    ...state,
    centerX: newCenterX,
    centerY: newCenterY,
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
    centerX: state.centerX - deltaX * scale,
    centerY: state.centerY + deltaY * scale,
  };
}

export function computeMaxIterations(zoom: number): number {
  return Math.max(50, Math.floor(100 + 50 * Math.log2(Math.max(1, zoom))));
}
