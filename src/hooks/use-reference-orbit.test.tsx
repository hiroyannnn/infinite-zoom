import { act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useReferenceOrbit } from "./use-reference-orbit";
import type { ReferenceOrbitWithSA, ViewerState, Viewport } from "@/core/types";

interface ProbeResult {
  current: ReferenceOrbitWithSA | null;
}

interface HookProbeProps {
  state: ViewerState;
  viewportRef: { current: Viewport };
  resultRef: ProbeResult;
}

function HookProbe({ state, viewportRef, resultRef }: HookProbeProps) {
  const value = useReferenceOrbit(state, viewportRef);
  useEffect(() => {
    resultRef.current = value;
  }, [resultRef, value]);
  return null;
}

class DeferredWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requestIds: number[] = [];

  constructor(private readonly onCreate: (worker: DeferredWorker) => void) {
    onCreate(this);
  }

  postMessage(message: unknown) {
    if (
      typeof message === "object" &&
      message !== null &&
      "id" in message &&
      typeof message.id === "number"
    ) {
      this.requestIds.push(message.id);
    }
  }

  terminate() {}

  respond(requestIndex: number, result: ReferenceOrbitWithSA) {
    const id = this.requestIds[requestIndex];
    if (id === undefined) throw new Error(`No request at index ${requestIndex}`);

    this.onmessage?.(
      new MessageEvent("message", {
        data: { id, orbit: result.orbit, sa: result.sa },
      })
    );
  }
}

function createOrbitResult(centerReStr: string): ReferenceOrbitWithSA {
  return {
    orbit: {
      centerReStr,
      centerImStr: "0",
      orbitData: new Float32Array(),
      magnitudeSquared: new Float32Array(),
      orbitLength: 0,
      escapeIteration: 0,
    },
    sa: null,
  };
}

const orbitResult = createOrbitResult("0");

describe("useReferenceOrbit", () => {
  it("ignores an in-flight orbit after zoom drops below the perturbation threshold", async () => {
    const workers: DeferredWorker[] = [];
    const highZoom: ViewerState = {
      centerX: 0,
      centerY: 0,
      centerXStr: "0",
      centerYStr: "0",
      zoom: 2e6,
      maxIterations: 300,
    };
    const lowZoom: ViewerState = { ...highZoom, zoom: 100 };
    const viewportRef = { current: { width: 800, height: 600 } };
    const result: ProbeResult = { current: null };
    const root = createRoot(document.createElement("div"));

    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("Worker", class extends DeferredWorker {
      constructor() {
        super((worker) => workers.push(worker));
      }
    });

    try {
      await act(async () => {
        root.render(createElement(HookProbe, { state: highZoom, viewportRef, resultRef: result }));
      });

      const worker = workers[0];
      if (!worker) throw new Error("Reference orbit worker was not created");
      expect(worker.requestIds).toEqual([0]);

      await act(async () => {
        root.render(createElement(HookProbe, { state: lowZoom, viewportRef, resultRef: result }));
      });
      expect(result.current).toBeNull();

      await act(async () => {
        worker.respond(0, orbitResult);
      });
      expect(result.current).toBeNull();

      await act(async () => {
        root.render(createElement(HookProbe, { state: highZoom, viewportRef, resultRef: result }));
      });
      expect(worker.requestIds).toEqual([0, 1]);

      await act(async () => {
        worker.respond(1, orbitResult);
      });
      expect(result.current).toEqual(orbitResult);
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it("does not return a completed orbit for a different center while the new orbit is pending", async () => {
    const workers: DeferredWorker[] = [];
    const highZoomA: ViewerState = {
      centerX: 0,
      centerY: 0,
      centerXStr: "0",
      centerYStr: "0",
      zoom: 2e6,
      maxIterations: 300,
    };
    const lowZoomA: ViewerState = { ...highZoomA, zoom: 100 };
    const highZoomB: ViewerState = {
      ...highZoomA,
      centerX: -0.1,
      centerXStr: "-0.1",
    };
    const orbitResultA = createOrbitResult("0");
    const orbitResultB = createOrbitResult("-0.1");
    const viewportRef = { current: { width: 800, height: 600 } };
    const result: ProbeResult = { current: null };
    const root = createRoot(document.createElement("div"));

    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("Worker", class extends DeferredWorker {
      constructor() {
        super((worker) => workers.push(worker));
      }
    });

    try {
      await act(async () => {
        root.render(createElement(HookProbe, { state: highZoomA, viewportRef, resultRef: result }));
      });

      const worker = workers[0];
      if (!worker) throw new Error("Reference orbit worker was not created");
      await act(async () => {
        worker.respond(0, orbitResultA);
      });
      expect(result.current).toEqual(orbitResultA);

      await act(async () => {
        root.render(createElement(HookProbe, { state: lowZoomA, viewportRef, resultRef: result }));
      });
      expect(result.current).toBeNull();

      await act(async () => {
        root.render(createElement(HookProbe, { state: highZoomB, viewportRef, resultRef: result }));
      });
      expect(worker.requestIds).toEqual([0, 1]);
      expect(result.current).toBeNull();

      await act(async () => {
        worker.respond(1, orbitResultB);
      });
      expect(result.current).toEqual(orbitResultB);
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
});
