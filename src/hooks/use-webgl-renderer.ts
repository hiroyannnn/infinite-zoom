import { useEffect, useRef } from "react";
import {
  createMandelbrotRenderer,
  type MandelbrotRenderer,
} from "@/webgl/renderer";
import type {
  ViewerState,
  Viewport,
  ReferenceOrbitWithSA,
} from "@/core/types";

export function useWebGLRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  state: ViewerState,
  viewportRef: React.MutableRefObject<Viewport>,
  referenceOrbitWithSA: ReferenceOrbitWithSA | null
) {
  const rendererRef = useRef<MandelbrotRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
      console.error("WebGL2 not supported");
      return;
    }

    rendererRef.current = createMandelbrotRenderer(gl);

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.floor(canvas.clientWidth * dpr);
      const height = Math.floor(canvas.clientHeight * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        viewportRef.current = { width, height };
        rendererRef.current?.resize(width, height);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [canvasRef, viewportRef]);

  useEffect(() => {
    if (referenceOrbitWithSA) {
      rendererRef.current?.updateReferenceOrbit(referenceOrbitWithSA.orbit);
      rendererRef.current?.updateSeriesApproximation(
        referenceOrbitWithSA.sa
      );
    }
    const frameId = requestAnimationFrame(() => {
      rendererRef.current?.updateAndRender(state, viewportRef.current);
    });
    return () => cancelAnimationFrame(frameId);
  }, [state, viewportRef, referenceOrbitWithSA]);
}
