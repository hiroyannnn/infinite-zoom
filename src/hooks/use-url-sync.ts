import { useEffect, useRef } from "react";
import { encodeStateToParams, decodeStateFromParams } from "@/core/url-state";
import type { Action } from "./use-mandelbrot-state";
import type { ViewerState } from "@/core/types";

const DEBOUNCE_MS = 300;

export function useUrlSync(
  state: ViewerState,
  dispatch: React.Dispatch<Action>
) {
  const initialized = useRef(false);

  useEffect(() => {
    const decoded = decodeStateFromParams(window.location.search);
    if (decoded) {
      dispatch({ type: "SET_STATE", state: decoded });
    }
    initialized.current = true;
  }, [dispatch]);

  useEffect(() => {
    if (!initialized.current) return;

    const timer = setTimeout(() => {
      const params = encodeStateToParams(state);
      const newUrl = `${window.location.pathname}?${params}`;
      window.history.replaceState(null, "", newUrl);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state]);
}
