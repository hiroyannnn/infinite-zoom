import { useEffect, useRef } from "react";
import {
  wheelDeltaToZoomFactor,
  computePinchMetrics,
  computePinchUpdate,
  type PinchMetrics,
} from "@/core/interaction";
import type { Action } from "./use-mandelbrot-state";
import type { ViewerState, Viewport } from "@/core/types";

export function useInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  stateRef: React.MutableRefObject<ViewerState>,
  dispatch: React.Dispatch<Action>,
  viewportRef: React.MutableRefObject<Viewport>
) {
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastPinch = useRef<PinchMetrics | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getDpr = () => window.devicePixelRatio || 1;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const dpr = getDpr();
      const factor = wheelDeltaToZoomFactor(e.deltaY, e.deltaMode);
      dispatch({
        type: "ZOOM",
        pixel: {
          x: (e.clientX - rect.left) * dpr,
          y: (e.clientY - rect.top) * dpr,
        },
        viewport: viewportRef.current,
        factor,
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dpr = getDpr();
      const deltaX = (e.clientX - lastMouse.current.x) * dpr;
      const deltaY = (e.clientY - lastMouse.current.y) * dpr;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      dispatch({
        type: "PAN",
        deltaX,
        deltaY,
        viewport: viewportRef.current,
      });
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const getTouchPoints = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = getDpr();
      return Array.from(e.touches).map((t) => ({
        x: (t.clientX - rect.left) * dpr,
        y: (t.clientY - rect.top) * dpr,
      }));
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const points = getTouchPoints(e);
      if (points.length === 1) {
        isDragging.current = true;
        lastMouse.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (points.length === 2) {
        isDragging.current = false;
        lastPinch.current = computePinchMetrics(points[0], points[1]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const points = getTouchPoints(e);

      if (points.length === 1 && isDragging.current) {
        const dpr = getDpr();
        const deltaX = (e.touches[0].clientX - lastMouse.current.x) * dpr;
        const deltaY = (e.touches[0].clientY - lastMouse.current.y) * dpr;
        lastMouse.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        dispatch({
          type: "PAN",
          deltaX,
          deltaY,
          viewport: viewportRef.current,
        });
      } else if (points.length === 2 && lastPinch.current) {
        const currMetrics = computePinchMetrics(points[0], points[1]);
        const newState = computePinchUpdate(
          stateRef.current,
          lastPinch.current,
          currMetrics,
          viewportRef.current
        );
        lastPinch.current = currMetrics;
        dispatch({ type: "SET_STATE", state: newState });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isDragging.current = false;
        lastPinch.current = null;
      } else if (e.touches.length === 1) {
        lastPinch.current = null;
        isDragging.current = true;
        lastMouse.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [canvasRef, stateRef, dispatch, viewportRef]);
}
