import { computeReferenceOrbitWithSA } from "./reference-orbit";

interface WorkerRequest {
  id: number;
  centerReStr: string;
  centerImStr: string;
  maxIterations: number;
  zoom: number;
  viewportRadius?: number;
  saOrder?: number;
}

interface WorkerResponse {
  id: number;
  orbit: {
    centerReStr: string;
    centerImStr: string;
    orbitData: Float32Array;
    magnitudeSquared: Float32Array;
    orbitLength: number;
    escapeIteration: number;
  };
  sa: {
    skipIterations: number;
    coefficients: Float32Array;
    radius: number;
    order: number;
  } | null;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, centerReStr, centerImStr, maxIterations, zoom, viewportRadius, saOrder } = e.data;

  const result = computeReferenceOrbitWithSA({
    centerReStr,
    centerImStr,
    maxIterations,
    zoom,
    viewportRadius,
    saOrder,
  });

  const response: WorkerResponse = {
    id,
    orbit: result.orbit,
    sa: result.sa,
  };

  // Transfer ArrayBuffers for zero-copy
  const transferables: Transferable[] = [
    result.orbit.orbitData.buffer,
    result.orbit.magnitudeSquared.buffer,
  ];
  if (result.sa) {
    transferables.push(result.sa.coefficients.buffer);
  }

  // Worker context postMessage with transferables
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self.postMessage as any)(response, transferables);
};
