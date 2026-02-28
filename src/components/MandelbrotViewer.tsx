"use client";

import { useEffect, useRef } from "react";
import { useMandelbrotState } from "@/hooks/use-mandelbrot-state";
import { useWebGLRenderer } from "@/hooks/use-webgl-renderer";
import { useInteraction } from "@/hooks/use-interaction";
import { useUrlSync } from "@/hooks/use-url-sync";
import { useReferenceOrbit } from "@/hooks/use-reference-orbit";
import type { Viewport } from "@/core/types";

export default function MandelbrotViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport>({ width: 0, height: 0 });
  const [state, dispatch] = useMandelbrotState();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const referenceOrbitWithSA = useReferenceOrbit(state, viewportRef);

  useUrlSync(state, dispatch);
  useWebGLRenderer(canvasRef, state, viewportRef, referenceOrbitWithSA);
  useInteraction(canvasRef, stateRef, dispatch, viewportRef);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        cursor: "grab",
      }}
    />
  );
}
