import { describe, it, expect } from "vitest";
import {
  wheelDeltaToZoomFactor,
  computePinchMetrics,
  computePinchUpdate,
} from "./interaction";
import type { ViewerState, Viewport } from "./types";

describe("wheelDeltaToZoomFactor", () => {
  it("deltaY > 0（下スクロール）でズームアウト（< 1）", () => {
    const factor = wheelDeltaToZoomFactor(100, 0);
    expect(factor).toBeLessThan(1);
    expect(factor).toBeGreaterThan(0);
  });

  it("deltaY < 0（上スクロール）でズームイン（> 1）", () => {
    const factor = wheelDeltaToZoomFactor(-100, 0);
    expect(factor).toBeGreaterThan(1);
  });

  it("deltaY = 0 で倍率 1.0", () => {
    const factor = wheelDeltaToZoomFactor(0, 0);
    expect(factor).toBeCloseTo(1);
  });

  it("deltaMode=1（行単位）でスケーリングされる", () => {
    const pixelFactor = wheelDeltaToZoomFactor(3, 0);
    const lineFactor = wheelDeltaToZoomFactor(3, 1);
    // 行単位は通常ピクセルより大きい変化
    expect(Math.abs(1 - lineFactor)).toBeGreaterThan(Math.abs(1 - pixelFactor));
  });
});

describe("computePinchMetrics", () => {
  it("中心点は2点の平均", () => {
    const metrics = computePinchMetrics(
      { x: 100, y: 100 },
      { x: 200, y: 200 }
    );
    expect(metrics.center.x).toBeCloseTo(150);
    expect(metrics.center.y).toBeCloseTo(150);
  });

  it("距離はユークリッド距離", () => {
    const metrics = computePinchMetrics(
      { x: 0, y: 0 },
      { x: 3, y: 4 }
    );
    expect(metrics.distance).toBeCloseTo(5);
  });

  it("同一点では距離 0", () => {
    const metrics = computePinchMetrics(
      { x: 50, y: 50 },
      { x: 50, y: 50 }
    );
    expect(metrics.distance).toBeCloseTo(0);
  });
});

describe("computePinchUpdate", () => {
  const state: ViewerState = {
    centerX: -0.5,
    centerY: 0,
    zoom: 1,
    maxIterations: 100,
  };
  const viewport: Viewport = { width: 800, height: 600 };

  it("同じメトリクスでは状態が変わらない", () => {
    const metrics = { center: { x: 400, y: 300 }, distance: 100 };
    const result = computePinchUpdate(state, metrics, metrics, viewport);
    expect(result.centerX).toBeCloseTo(state.centerX);
    expect(result.centerY).toBeCloseTo(state.centerY);
    expect(result.zoom).toBeCloseTo(state.zoom);
  });

  it("距離が2倍になるとズームが2倍になる", () => {
    const prev = { center: { x: 400, y: 300 }, distance: 100 };
    const curr = { center: { x: 400, y: 300 }, distance: 200 };
    const result = computePinchUpdate(state, prev, curr, viewport);
    expect(result.zoom).toBeCloseTo(state.zoom * 2);
  });

  it("中心が移動するとパンする", () => {
    const prev = { center: { x: 400, y: 300 }, distance: 100 };
    const curr = { center: { x: 500, y: 300 }, distance: 100 };
    const result = computePinchUpdate(state, prev, curr, viewport);
    // 右にドラッグ → centerX が減る
    expect(result.centerX).toBeLessThan(state.centerX);
  });
});
