import { panByPixelDelta, zoomAtPoint } from "./mandelbrot-math";
import type { ViewerState, Viewport, PixelPoint } from "./types";

const ZOOM_SENSITIVITY = 0.001;
const LINE_DELTA_MULTIPLIER = 20;

export function wheelDeltaToZoomFactor(
  deltaY: number,
  deltaMode: number
): number {
  const scaledDelta = deltaMode === 1 ? deltaY * LINE_DELTA_MULTIPLIER : deltaY;
  return Math.pow(2, -scaledDelta * ZOOM_SENSITIVITY);
}

export interface PinchMetrics {
  center: PixelPoint;
  distance: number;
}

export function computePinchMetrics(
  touch1: PixelPoint,
  touch2: PixelPoint
): PinchMetrics {
  return {
    center: {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2,
    },
    distance: Math.sqrt(
      (touch2.x - touch1.x) ** 2 + (touch2.y - touch1.y) ** 2
    ),
  };
}

export function computePinchUpdate(
  state: ViewerState,
  prev: PinchMetrics,
  curr: PinchMetrics,
  viewport: Viewport
): ViewerState {
  const panDeltaX = prev.center.x - curr.center.x;
  const panDeltaY = prev.center.y - curr.center.y;
  let newState = panByPixelDelta(state, -panDeltaX, -panDeltaY, viewport);

  if (prev.distance > 0) {
    const zoomFactor = curr.distance / prev.distance;
    newState = zoomAtPoint(newState, curr.center, viewport, zoomFactor);
  }

  return newState;
}
