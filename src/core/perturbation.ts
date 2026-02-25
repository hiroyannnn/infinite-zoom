import type { ReferenceOrbit } from "./types";

const ESCAPE_RADIUS_SQUARED = 4;

export interface PerturbationResult {
  iterations: number;
  escaped: boolean;
  smoothIter: number;
}

export function computePerturbation(
  orbit: ReferenceOrbit,
  deltaCRe: number,
  deltaCIm: number,
  maxIter: number
): PerturbationResult {
  let dzRe = 0;
  let dzIm = 0;
  let n = 0;

  for (let iter = 0; iter < maxIter; iter++) {
    if (n >= orbit.orbitLength) {
      // Fallback: we've exhausted the orbit, treat as not escaped
      return { iterations: maxIter, escaped: false, smoothIter: maxIter };
    }

    const ZnRe = orbit.orbitData[n * 2];
    const ZnIm = orbit.orbitData[n * 2 + 1];

    // Full z = Z_n + δz_n
    const fullRe = ZnRe + dzRe;
    const fullIm = ZnIm + dzIm;
    const fullMagSq = fullRe * fullRe + fullIm * fullIm;

    // Escape check on full value
    if (fullMagSq > ESCAPE_RADIUS_SQUARED) {
      const smoothIter = iter + 1 - Math.log2(Math.log2(fullMagSq) / 2);
      return {
        iterations: iter,
        escaped: true,
        smoothIter: Math.max(0, smoothIter),
      };
    }

    // Rebasing: if |δz|² > |Z_n|², the perturbation is too large
    const dzMagSq = dzRe * dzRe + dzIm * dzIm;
    const ZnMagSq = orbit.magnitudeSquared[n];
    if (n > 0 && dzMagSq > ZnMagSq && ZnMagSq > 1e-10) {
      // Rebase: treat full_z as new δc-like offset and restart from orbit beginning
      // This means δz = full_z (since Z_0 = 0, full_z at n=0 is δz itself)
      dzRe = fullRe;
      dzIm = fullIm;
      n = 0;
      continue;
    }

    // δz_{n+1} = 2·Z_n·δz_n + δz_n² + δc
    // 2·Z_n·δz_n
    const twoZdzRe = 2 * (ZnRe * dzRe - ZnIm * dzIm);
    const twoZdzIm = 2 * (ZnRe * dzIm + ZnIm * dzRe);

    // δz_n²
    const dzSqRe = dzRe * dzRe - dzIm * dzIm;
    const dzSqIm = 2 * dzRe * dzIm;

    // δz_{n+1} = 2·Z_n·δz_n + δz_n² + δc
    dzRe = twoZdzRe + dzSqRe + deltaCRe;
    dzIm = twoZdzIm + dzSqIm + deltaCIm;

    n++;
  }

  return { iterations: maxIter, escaped: false, smoothIter: maxIter };
}
