import { useReducer } from "react";
import {
  zoomAtPoint,
  panByPixelDelta,
  computeMaxIterations,
} from "@/core/mandelbrot-math";
import { DEFAULT_STATE } from "@/core/url-state";
import type { ViewerState, Viewport, PixelPoint } from "@/core/types";

export type Action =
  | { type: "ZOOM"; pixel: PixelPoint; viewport: Viewport; factor: number }
  | { type: "PAN"; deltaX: number; deltaY: number; viewport: Viewport }
  | { type: "SET_STATE"; state: ViewerState }
  | { type: "RESET" };

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
      return {
        ...newState,
        maxIterations: computeMaxIterations(newState.zoom),
      };
    }
    case "PAN":
      return panByPixelDelta(
        state,
        action.deltaX,
        action.deltaY,
        action.viewport
      );
    case "SET_STATE":
      return action.state;
    case "RESET":
      return DEFAULT_STATE;
  }
}

export function useMandelbrotState(initialState: ViewerState = DEFAULT_STATE) {
  return useReducer(mandelbrotReducer, initialState);
}
