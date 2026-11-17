import { describe, expect, it, vi } from "vitest";
import Decimal from "decimal.js";
import { mandelbrotReducer } from "@/hooks/use-mandelbrot-state";
import { panByPixelDelta, zoomAtPoint } from "./mandelbrot-math";
import { decodeStateFromParams, encodeStateToParams } from "./url-state";
import type { ViewerState, Viewport } from "./types";

const viewport: Viewport = { width: 800, height: 600 };
const precision = 60;
const PreciseDecimal = Decimal.clone({ precision });

function deepState(zoom = 1e18): ViewerState {
  return {
    centerX: Number("-0.743643887037151007923504"),
    centerY: Number("0.13182590420533000247815"),
    centerXStr: "-0.743643887037151007923504",
    centerYStr: "0.13182590420533000247815",
    zoom,
    maxIterations: 100,
  };
}

function decimal(value: string | number): Decimal {
  return new PreciseDecimal(value);
}

describe("arbitrary precision view transforms", () => {
  it("bounds arithmetic precision for compact subnormal URL coordinates", () => {
    const originalSet = Decimal.set.bind(Decimal);
    const guard = vi.spyOn(Decimal, "set").mockImplementation((configuration) => {
      if ((configuration.precision ?? 0) > 1000) {
        throw new Error("Compact coordinates requested unbounded arithmetic");
      }
      return originalSet(configuration);
    });
    try {
      const initial = {
        ...deepState(1e24),
        centerX: 0,
        centerXStr: "1e-1000000000",
      };
      const result = panByPixelDelta(initial, 1, 0, viewport);
      expect(Number(result.centerXStr)).toBeLessThan(0);
      expect(result.centerX).toBe(Number(result.centerXStr));
    } finally {
      guard.mockRestore();
    }
  });

  it("retains coordinate digits when a tiny pan crosses an integer boundary", () => {
    const exact = Decimal.clone({ precision: 100 });
    const center = `-0.${"9".repeat(60)}`;
    const initial = {
      ...deepState(1e24),
      centerX: Number(center),
      centerXStr: center,
    };

    const result = panByPixelDelta(initial, 1, 0, viewport);

    expect(result.centerXStr).toBe(new exact(center).minus("5e-27").toString());
  });

  it("keeps exact URL coordinate text for a zero-distance pan", () => {
    const initial = {
      ...deepState(),
      centerXStr: "-0.74364388703715100792350400",
      centerYStr: "0.1318259042053300024781500",
    };

    const result = panByPixelDelta(initial, 0, 0, viewport);

    expect(result.centerXStr).toBe(initial.centerXStr);
    expect(result.centerYStr).toBe(initial.centerYStr);
  });

  it("updates precise URL coordinates for repeated pans below Number resolution", () => {
    const initial = deepState();
    const scale = decimal(3).div(initial.zoom * viewport.height);
    const once = panByPixelDelta(initial, 1, -2, viewport);

    expect(once.centerX).toBe(initial.centerX);
    expect(once.centerXStr).toBe(
      decimal(initial.centerXStr!).minus(scale).toString()
    );
    expect(once.centerYStr).toBe(
      decimal(initial.centerYStr!).minus(scale.mul(2)).toString()
    );

    const repeated = panByPixelDelta(once, 1, -2, viewport);
    expect(repeated.centerXStr).toBe(
      decimal(initial.centerXStr!).minus(scale.mul(2)).toString()
    );
    expect(repeated.centerYStr).toBe(
      decimal(initial.centerYStr!).minus(scale.mul(4)).toString()
    );

    const decoded = decodeStateFromParams(encodeStateToParams(repeated));
    expect(decoded?.centerXStr).toBe(repeated.centerXStr);
    expect(decoded?.centerYStr).toBe(repeated.centerYStr);
  });

  it("keeps the cursor anchor when zooming a string-backed deep center", () => {
    const initial = deepState();
    const pixel = { x: 600, y: 200 };
    const newZoom = initial.zoom * 2;
    const oldScale = 3 / (initial.zoom * viewport.height);
    const newScale = 3 / (newZoom * viewport.height);
    const offsetX = pixel.x - viewport.width / 2;
    const offsetY = pixel.y - viewport.height / 2;

    const result = zoomAtPoint(initial, pixel, viewport, 2);

    expect(result.centerXStr).toBe(
      decimal(initial.centerXStr!).plus(offsetX * (oldScale - newScale)).toString()
    );
    expect(result.centerYStr).toBe(
      decimal(initial.centerYStr!).plus(offsetY * (newScale - oldScale)).toString()
    );
    expect(result.zoom).toBe(newZoom);
  });

  it("retains exact URL coordinates through low zoom and a high-zoom round trip", () => {
    const initial = deepState(1e12);
    const atLowZoom = mandelbrotReducer(initial, {
      type: "ZOOM",
      pixel: { x: 400, y: 300 },
      viewport,
      factor: 1e-9,
    });
    expect(atLowZoom.zoom).toBeCloseTo(1e3);
    expect(atLowZoom.centerXStr).toBe(initial.centerXStr);
    expect(atLowZoom.centerYStr).toBe(initial.centerYStr);
    expect(new URLSearchParams(encodeStateToParams(atLowZoom)).get("x")).toBe(
      initial.centerXStr
    );

    const panned = mandelbrotReducer(atLowZoom, {
      type: "PAN",
      deltaX: 1,
      deltaY: 0,
      viewport,
    });
    expect(panned.centerXStr).not.toBe(initial.centerXStr);

    const decodedLowZoom = decodeStateFromParams(encodeStateToParams(panned));
    expect(decodedLowZoom?.centerXStr).toBe(panned.centerXStr);
    expect(decodedLowZoom?.centerYStr).toBe(panned.centerYStr);

    const pinchUpdate = zoomAtPoint(
      decodedLowZoom!,
      { x: 400, y: 300 },
      viewport,
      2e3
    );
    const atHighZoom = mandelbrotReducer(decodedLowZoom!, {
      type: "SET_STATE",
      state: pinchUpdate,
    });
    expect(atHighZoom.zoom).toBeGreaterThanOrEqual(1e6);
    expect(atHighZoom.centerXStr).toBe(panned.centerXStr);
    expect(atHighZoom.centerYStr).toBe(panned.centerYStr);

    const decoded = decodeStateFromParams(encodeStateToParams(atHighZoom));
    expect(decoded?.centerXStr).toBe(atHighZoom.centerXStr);
    expect(decoded?.centerYStr).toBe(atHighZoom.centerYStr);
  });

  it("creates precision strings for high-zoom SET_STATE updates", () => {
    const initial: ViewerState = {
      centerX: -0.5,
      centerY: 0,
      zoom: 1,
      maxIterations: 100,
    };
    const cursorZoom = zoomAtPoint(
      initial,
      { x: 500, y: 350 },
      viewport,
      1e6
    );

    const result = mandelbrotReducer(initial, {
      type: "SET_STATE",
      state: cursorZoom,
    });

    expect(result.centerXStr).toBe(result.centerX.toPrecision(17));
    expect(result.centerYStr).toBe(result.centerY.toPrecision(17));
  });

  it("normalizes Number-valid empty and padded URL coordinates before Decimal transforms", () => {
    const inputs = [
      "x=&y=0.12345678901234567890&z=100",
      "x=+++&y=+0.12345678901234567890+&z=100",
    ];

    for (const input of inputs) {
      const decoded = decodeStateFromParams(input);
      expect(decoded?.centerXStr).toBe("0");
      expect(decoded?.centerYStr).toBe("0.12345678901234567890");

      const shifted = panByPixelDelta(decoded!, 1, 1, viewport);
      expect(shifted.centerYStr).not.toBe(decoded?.centerYStr);
    }

    const alternateNumber = decodeStateFromParams(
      "x=0x10&y=0.12345678901234567890&z=100"
    );
    expect(alternateNumber?.centerX).toBe(16);
    expect(() => panByPixelDelta(alternateNumber!, 1, 1, viewport)).not.toThrow();

    const shortDeepCoordinates = decodeStateFromParams(
      "x=-0.5&y=0&z=1000000"
    );
    expect(shortDeepCoordinates?.centerXStr).toBe("-0.5");
    expect(shortDeepCoordinates?.centerYStr).toBe("0");
  });
});
