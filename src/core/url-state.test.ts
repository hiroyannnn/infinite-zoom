import { describe, it, expect } from "vitest";
import {
  encodeStateToParams,
  decodeStateFromParams,
  DEFAULT_STATE,
} from "./url-state";
import type { ViewerState } from "./types";

describe("DEFAULT_STATE", () => {
  it("Mandelbrot集合の典型的な初期表示を持つ", () => {
    expect(DEFAULT_STATE.centerX).toBe(-0.5);
    expect(DEFAULT_STATE.centerY).toBe(0);
    expect(DEFAULT_STATE.zoom).toBe(1);
    expect(DEFAULT_STATE.maxIterations).toBeGreaterThan(0);
  });
});

describe("encodeStateToParams", () => {
  it("x, y, z パラメータを含む文字列を返す", () => {
    const result = encodeStateToParams(DEFAULT_STATE);
    expect(result).toContain("x=");
    expect(result).toContain("y=");
    expect(result).toContain("z=");
  });

  it("URLSearchParams として解析可能な文字列を返す", () => {
    const result = encodeStateToParams(DEFAULT_STATE);
    const params = new URLSearchParams(result);
    expect(params.get("x")).not.toBeNull();
    expect(params.get("y")).not.toBeNull();
    expect(params.get("z")).not.toBeNull();
  });
});

describe("decodeStateFromParams", () => {
  it("空文字列では null を返す", () => {
    expect(decodeStateFromParams("")).toBeNull();
  });

  it("無効な数値では null を返す", () => {
    expect(decodeStateFromParams("x=abc&y=def&z=ghi")).toBeNull();
  });

  it("パラメータが欠けている場合は null を返す", () => {
    expect(decodeStateFromParams("x=-0.5&y=0")).toBeNull();
  });

  it("有効なパラメータで正しい state を返す", () => {
    const result = decodeStateFromParams("x=-0.5&y=0&z=1");
    expect(result).not.toBeNull();
    expect(result!.centerX).toBeCloseTo(-0.5);
    expect(result!.centerY).toBeCloseTo(0);
    expect(result!.zoom).toBeCloseTo(1);
  });

  it("NaN を含む場合は null を返す", () => {
    expect(decodeStateFromParams("x=NaN&y=0&z=1")).toBeNull();
  });

  it("Infinity を含む場合は null を返す", () => {
    expect(decodeStateFromParams("x=Infinity&y=0&z=1")).toBeNull();
  });

  it("zoom が 0 以下の場合は null を返す", () => {
    expect(decodeStateFromParams("x=0&y=0&z=0")).toBeNull();
    expect(decodeStateFromParams("x=0&y=0&z=-1")).toBeNull();
  });
});

describe("encode → decode ラウンドトリップ", () => {
  it("デフォルト状態が往復する", () => {
    const encoded = encodeStateToParams(DEFAULT_STATE);
    const decoded = decodeStateFromParams(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.centerX).toBeCloseTo(DEFAULT_STATE.centerX, 5);
    expect(decoded!.centerY).toBeCloseTo(DEFAULT_STATE.centerY, 5);
    expect(decoded!.zoom).toBeCloseTo(DEFAULT_STATE.zoom, 5);
  });

  it("深いズーム座標が往復する", () => {
    const state: ViewerState = {
      centerX: -0.7435669,
      centerY: 0.1314023,
      zoom: 10000,
      maxIterations: 500,
    };
    const encoded = encodeStateToParams(state);
    const decoded = decodeStateFromParams(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.centerX).toBeCloseTo(state.centerX, 5);
    expect(decoded!.centerY).toBeCloseTo(state.centerY, 5);
    expect(decoded!.zoom).toBeCloseTo(state.zoom, 2);
  });
});
