import { useReducer } from "react";
import {
  zoomAtPoint,
  panByPixelDelta,
  computeMaxIterations,
} from "@/core/mandelbrot-math";
import { DEFAULT_STATE } from "@/core/url-state";
import { PRECISION_ZOOM_THRESHOLD } from "@/core/arbitrary-precision";
import type { ViewerState, Viewport, PixelPoint } from "@/core/types";

export type Action =
  | { type: "ZOOM"; pixel: PixelPoint; viewport: Viewport; factor: number }
  | { type: "PAN"; deltaX: number; deltaY: number; viewport: Viewport }
  | { type: "SET_STATE"; state: ViewerState }
  | { type: "RESET" };

function syncPrecisionStrings(state: ViewerState): ViewerState {
  if (state.zoom >= PRECISION_ZOOM_THRESHOLD) {
    return {
      ...state,
      centerXStr: state.centerXStr ?? state.centerX.toPrecision(17),
      centerYStr: state.centerYStr ?? state.centerY.toPrecision(17),
    };
  }
  // Clearing these would lose precision when zooming back in.
  return state;
}

export function mandelbrotReducer(
  state: ViewerState,
  action: Action
): ViewerState {
  switch (action.type) {
    case "ZOOM": {
      const newState = zoomAtPoint(
        state,
        action.pixel,
        action.viewport,
        action.factor
      );
      return syncPrecisionStrings({
        ...newState,
        maxIterations: computeMaxIterations(newState.zoom),
      });
    }
    case "PAN": {
      const newState = panByPixelDelta(
        state,
        action.deltaX,
        action.deltaY,
        action.viewport
      );
      return syncPrecisionStrings(newState);
    }
    case "SET_STATE":
      return syncPrecisionStrings(action.state);
    case "RESET":
      return DEFAULT_STATE;
  }
}

export function useMandelbrotState(initialState: ViewerState = DEFAULT_STATE) {
  return useReducer(mandelbrotReducer, initialState);
}
