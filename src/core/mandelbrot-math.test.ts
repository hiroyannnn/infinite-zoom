import { describe, it, expect } from "vitest";
import {
  computeScale,
  pixelToComplex,
  complexToPixel,
  zoomAtPoint,
  panByPixelDelta,
  computeMaxIterations,
  splitDoubleSingle,
} from "./mandelbrot-math";
import type { ViewerState, Viewport, PixelPoint } from "./types";

const defaultState: ViewerState = {
  centerX: -0.5,
  centerY: 0,
  zoom: 1,
  maxIterations: 100,
};

const viewport: Viewport = { width: 800, height: 600 };

describe("computeScale", () => {
  it("zoom=1 のとき、ビューポートの高さで約3単位分を表示する", () => {
    const scale = computeScale(1, viewport);
    // 初期表示で y 方向に [-1.5, 1.5] = 3単位分
    // scale = 3 / 600 = 0.005
    expect(scale).toBeCloseTo(3 / viewport.height);
  });

  it("zoom が大きくなると scale は小さくなる", () => {
    const s1 = computeScale(1, viewport);
    const s10 = computeScale(10, viewport);
    expect(s10).toBeLessThan(s1);
  });

  it("zoom に反比例する", () => {
    const s1 = computeScale(1, viewport);
    const s100 = computeScale(100, viewport);
    expect(s1 / s100).toBeCloseTo(100);
  });
});

describe("pixelToComplex", () => {
  it("ビューポート中心は state の center と一致する", () => {
    const center: PixelPoint = { x: 400, y: 300 };
    const result = pixelToComplex(center, defaultState, viewport);
    expect(result.re).toBeCloseTo(defaultState.centerX);
    expect(result.im).toBeCloseTo(defaultState.centerY);
  });

  it("右に動くと re が増える", () => {
    const left = pixelToComplex({ x: 300, y: 300 }, defaultState, viewport);
    const right = pixelToComplex({ x: 500, y: 300 }, defaultState, viewport);
    expect(right.re).toBeGreaterThan(left.re);
  });

  it("上に動くと im が減る（画面Y軸は下向き、虚軸は上向き）", () => {
    const top = pixelToComplex({ x: 400, y: 200 }, defaultState, viewport);
    const bottom = pixelToComplex({ x: 400, y: 400 }, defaultState, viewport);
    expect(top.im).toBeGreaterThan(bottom.im);
  });
});

describe("complexToPixel", () => {
  it("center は ビューポート中心に対応する", () => {
    const result = complexToPixel(
      { re: defaultState.centerX, im: defaultState.centerY },
      defaultState,
      viewport
    );
    expect(result.x).toBeCloseTo(400);
    expect(result.y).toBeCloseTo(300);
  });

  it("pixelToComplex と往復すると元に戻る", () => {
    const original: PixelPoint = { x: 123, y: 456 };
    const complex = pixelToComplex(original, defaultState, viewport);
    const roundTrip = complexToPixel(complex, defaultState, viewport);
    expect(roundTrip.x).toBeCloseTo(original.x);
    expect(roundTrip.y).toBeCloseTo(original.y);
  });
});

describe("zoomAtPoint", () => {
  it("中心でズームすると center は変わらない", () => {
    const center: PixelPoint = { x: 400, y: 300 };
    const result = zoomAtPoint(defaultState, center, viewport, 2);
    expect(result.centerX).toBeCloseTo(defaultState.centerX);
    expect(result.centerY).toBeCloseTo(defaultState.centerY);
    expect(result.zoom).toBeCloseTo(2);
  });

  it("ズーム倍率1.0では状態が変わらない", () => {
    const pixel: PixelPoint = { x: 200, y: 100 };
    const result = zoomAtPoint(defaultState, pixel, viewport, 1);
    expect(result.centerX).toBeCloseTo(defaultState.centerX);
    expect(result.centerY).toBeCloseTo(defaultState.centerY);
    expect(result.zoom).toBeCloseTo(defaultState.zoom);
  });

  it("オフセンターでズームすると center がカーソル方向に移動する", () => {
    // カーソルが右側にある場合
    const pixel: PixelPoint = { x: 600, y: 300 };
    const result = zoomAtPoint(defaultState, pixel, viewport, 2);
    // center は右（re が増える方向）に移動するはず
    expect(result.centerX).toBeGreaterThan(defaultState.centerX);
  });

  it("カーソル下の複素平面座標がズーム前後で固定される", () => {
    const pixel: PixelPoint = { x: 250, y: 150 };
    const complexBefore = pixelToComplex(pixel, defaultState, viewport);
    const newState = zoomAtPoint(defaultState, pixel, viewport, 3);
    const complexAfter = pixelToComplex(pixel, newState, viewport);
    expect(complexAfter.re).toBeCloseTo(complexBefore.re);
    expect(complexAfter.im).toBeCloseTo(complexBefore.im);
  });
});

describe("panByPixelDelta", () => {
  it("delta (0,0) では状態が変わらない", () => {
    const result = panByPixelDelta(defaultState, 0, 0, viewport);
    expect(result.centerX).toBeCloseTo(defaultState.centerX);
    expect(result.centerY).toBeCloseTo(defaultState.centerY);
  });

  it("右にドラッグすると center が左（re 減少）に移動する", () => {
    const result = panByPixelDelta(defaultState, 100, 0, viewport);
    expect(result.centerX).toBeLessThan(defaultState.centerX);
  });

  it("下にドラッグすると center が上（im 増加）に移動する", () => {
    const result = panByPixelDelta(defaultState, 0, 100, viewport);
    expect(result.centerY).toBeGreaterThan(defaultState.centerY);
  });

  it("zoom は変わらない", () => {
    const result = panByPixelDelta(defaultState, 50, 50, viewport);
    expect(result.zoom).toBe(defaultState.zoom);
  });
});

describe("computeMaxIterations", () => {
  it("zoom=1 で妥当な値を返す", () => {
    const iter = computeMaxIterations(1);
    expect(iter).toBeGreaterThanOrEqual(50);
    expect(iter).toBeLessThanOrEqual(200);
  });

  it("zoom が大きくなると反復回数が増える", () => {
    const iter1 = computeMaxIterations(1);
    const iter1000 = computeMaxIterations(1000);
    expect(iter1000).toBeGreaterThan(iter1);
  });

  it("常に正の整数を返す", () => {
    for (const z of [0.1, 1, 10, 100, 1000, 1e6]) {
      const iter = computeMaxIterations(z);
      expect(iter).toBeGreaterThan(0);
      expect(Number.isInteger(iter)).toBe(true);
    }
  });
});

describe("splitDoubleSingle", () => {
  it("hi + lo が元の値を復元する", () => {
    const value = 1.23456789012345;
    const { hi, lo } = splitDoubleSingle(value);
    expect(hi + lo).toBeCloseTo(value, 14);
  });

  it("hi は float32 に丸められる", () => {
    const { hi } = splitDoubleSingle(Math.PI);
    expect(hi).toBe(Math.fround(Math.PI));
  });

  it("整数値では lo が 0 に近い", () => {
    const { lo } = splitDoubleSingle(42);
    expect(Math.abs(lo)).toBeLessThan(1e-5);
  });
});
