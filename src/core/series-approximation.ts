export interface SAState {
  coeffRe: Float64Array;
  coeffIm: Float64Array;
}

const SA_MARGIN = 0.01;
const SA_TAIL_EPSILON = 1e-6;

export function createSAState(order: number): SAState {
  return {
    coeffRe: new Float64Array(order),
    coeffIm: new Float64Array(order),
  };
}

export function updateSACoefficients(
  state: SAState,
  znRe: number,
  znIm: number,
  order: number
): void {
  const nextRe = new Float64Array(order);
  const nextIm = new Float64Array(order);

  for (let k = 0; k < order; k++) {
    // 2·Z_n·A_k(n)  (complex multiplication)
    const twoZAkRe = 2 * (znRe * state.coeffRe[k] - znIm * state.coeffIm[k]);
    const twoZAkIm = 2 * (znRe * state.coeffIm[k] + znIm * state.coeffRe[k]);

    // Convolution sum: Σ_{j=0}^{k-1} A_{j+1}(n) · A_{k-j}(n) for k≥1 (k here is 0-indexed)
    let convRe = 0;
    let convIm = 0;
    for (let j = 0; j < k; j++) {
      const aRe = state.coeffRe[j];
      const aIm = state.coeffIm[j];
      const bRe = state.coeffRe[k - 1 - j];
      const bIm = state.coeffIm[k - 1 - j];
      convRe += aRe * bRe - aIm * bIm;
      convIm += aRe * bIm + aIm * bRe;
    }

    // A_k(n+1) = 2·Z_n·A_k(n) + conv + δ_{k,0}
    nextRe[k] = twoZAkRe + convRe + (k === 0 ? 1 : 0);
    nextIm[k] = twoZAkIm + convIm;
  }

  state.coeffRe.set(nextRe);
  state.coeffIm.set(nextIm);
}

export function isSAValid(
  state: SAState,
  znMagnitude: number,
  radius: number,
  order: number,
  margin: number = SA_MARGIN,
  epsilon: number = SA_TAIL_EPSILON
): boolean {
  // Compute ρ(n) = Σ_{k=1}^{order} |A_k(n)| · r^k
  let rho = 0;
  let rPow = radius;
  for (let k = 0; k < order; k++) {
    const mag = Math.sqrt(
      state.coeffRe[k] * state.coeffRe[k] +
      state.coeffIm[k] * state.coeffIm[k]
    );
    rho += mag * rPow;
    rPow *= radius;
  }

  // For tail estimate, we'd need A_{order+1} which we don't compute.
  // Use the last computed term as an estimate.
  const lastMag = Math.sqrt(
    state.coeffRe[order - 1] * state.coeffRe[order - 1] +
    state.coeffIm[order - 1] * state.coeffIm[order - 1]
  );
  const tail = lastMag * rPow; // rPow is now r^{order+1}

  // |Z_n| + ρ + tail < 2 - margin
  if (znMagnitude + rho + tail >= 2 - margin) return false;

  // tail < ε · max(1, ρ)
  if (tail >= epsilon * Math.max(1, rho)) return false;

  return true;
}

export function extractNormalizedCoefficients(
  state: SAState,
  radius: number,
  order: number
): Float32Array {
  const result = new Float32Array(order * 2);
  let rPow = radius;

  for (let k = 0; k < order; k++) {
    result[k * 2] = state.coeffRe[k] * rPow;
    result[k * 2 + 1] = state.coeffIm[k] * rPow;
    rPow *= radius;
  }

  return result;
}
