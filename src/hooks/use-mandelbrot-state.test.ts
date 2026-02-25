import { describe, it, expect } from "vitest";
import { mandelbrotReducer, type Action } from "./use-mandelbrot-state";
import { DEFAULT_STATE } from "@/core/url-state";
import type { ViewerState, Viewport } from "@/core/types";

const viewport: Viewport = { width: 800, height: 600 };

describe("mandelbrotReducer", () => {
  it("ZOOM アクションで zoom が変化する", () => {
    const action: Action = {
      type: "ZOOM",
      pixel: { x: 400, y: 300 },
      viewport,
      factor: 2,
    };
    const result = mandelbrotReducer(DEFAULT_STATE, action);
    expect(result.zoom).toBeCloseTo(DEFAULT_STATE.zoom * 2);
  });

  it("PAN アクションで center が移動する", () => {
    const action: Action = {
      type: "PAN",
      deltaX: 100,
      deltaY: 0,
      viewport,
    };
    const result = mandelbrotReducer(DEFAULT_STATE, action);
    expect(result.centerX).not.toBeCloseTo(DEFAULT_STATE.centerX);
  });

  it("SET_STATE アクションで状態が置き換わる", () => {
    const newState: ViewerState = {
      centerX: 1,
      centerY: 2,
      zoom: 50,
      maxIterations: 300,
    };
    const action: Action = { type: "SET_STATE", state: newState };
    const result = mandelbrotReducer(DEFAULT_STATE, action);
    expect(result).toEqual(newState);
  });

  it("RESET アクションで DEFAULT_STATE に戻る", () => {
    const modified: ViewerState = {
      centerX: 1,
      centerY: 2,
      zoom: 50,
      maxIterations: 300,
    };
    const action: Action = { type: "RESET" };
    const result = mandelbrotReducer(modified, action);
    expect(result).toEqual(DEFAULT_STATE);
  });

  it("ZOOM 後に maxIterations が更新される", () => {
    const action: Action = {
      type: "ZOOM",
      pixel: { x: 400, y: 300 },
      viewport,
      factor: 100,
    };
    const result = mandelbrotReducer(DEFAULT_STATE, action);
    expect(result.maxIterations).toBeGreaterThan(DEFAULT_STATE.maxIterations);
  });
});
