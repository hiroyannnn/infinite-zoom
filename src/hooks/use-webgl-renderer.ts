import { useEffect, useRef } from "react";
import {
  createMandelbrotRenderer,
  type MandelbrotRenderer,
} from "@/webgl/renderer";
import type { ViewerState, Viewport } from "@/core/types";

export function useWebGLRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  state: ViewerState,
  viewportRef: React.MutableRefObject<Viewport>
) {
  const rendererRef = useRef<MandelbrotRenderer | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize WebGL context and renderer
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

  // Render on state change
  useEffect(() => {
    const render = () => {
      if (rendererRef.current) {
        rendererRef.current.updateAndRender(
          stateRef.current,
          viewportRef.current
        );
      }
    };
    const frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [state, viewportRef]);
}
