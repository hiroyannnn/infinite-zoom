import type { ReferenceOrbitWithSA } from "./types";

interface PendingRequest {
  resolve: (result: ReferenceOrbitWithSA) => void;
  reject: (error: Error) => void;
}

export interface ReferenceOrbitClient {
  compute(params: {
    centerReStr: string;
    centerImStr: string;
    maxIterations: number;
    zoom: number;
    viewportRadius?: number;
    saOrder?: number;
  }): Promise<ReferenceOrbitWithSA>;
  destroy(): void;
}

export function createReferenceOrbitClient(): ReferenceOrbitClient {
  const worker = new Worker(
    new URL("./reference-orbit-worker.ts", import.meta.url),
    { type: "module" }
  );

  let nextId = 0;
  const pending = new Map<number, PendingRequest>();

  worker.onmessage = (e: MessageEvent) => {
    const { id, orbit, sa } = e.data;
    const request = pending.get(id);
    if (request) {
      pending.delete(id);
      request.resolve({ orbit, sa });
    }
  };

  worker.onerror = (e: ErrorEvent) => {
    for (const request of pending.values()) {
      request.reject(new Error(e.message));
    }
    pending.clear();
  };

  return {
    compute(params) {
      const id = nextId++;
      return new Promise<ReferenceOrbitWithSA>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, ...params });
      });
    },

    destroy() {
      worker.terminate();
      for (const request of pending.values()) {
        request.reject(new Error("Worker terminated"));
      }
      pending.clear();
    },
  };
}
