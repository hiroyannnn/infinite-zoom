import {
  createDecimal,
  complexSquare,
  complexAdd,
  complexMagnitudeSquared,
  requiredPrecision,
} from "./arbitrary-precision";
import type { ReferenceOrbit } from "./types";

const ESCAPE_RADIUS_SQUARED = 1024 * 1024;

interface ComputeReferenceOrbitParams {
  centerReStr: string;
  centerImStr: string;
  maxIterations: number;
  zoom?: number;
}

export function computeReferenceOrbit(
  params: ComputeReferenceOrbitParams
): ReferenceOrbit {
  const { centerReStr, centerImStr, maxIterations, zoom = 1 } = params;
  const precision = requiredPrecision(zoom);

  const cRe = createDecimal(centerReStr, precision);
  const cIm = createDecimal(centerImStr, precision);

  const orbitData = new Float32Array(maxIterations * 2);
  const magnitudeSquared = new Float32Array(maxIterations);

  let zRe = createDecimal(0, precision);
  let zIm = createDecimal(0, precision);
  let escapeIteration = -1;

  for (let i = 0; i < maxIterations; i++) {
    orbitData[i * 2] = zRe.toNumber();
    orbitData[i * 2 + 1] = zIm.toNumber();
    const magSq = complexMagnitudeSquared(zRe, zIm, precision);
    magnitudeSquared[i] = magSq.toNumber();

    if (escapeIteration === -1 && magSq.toNumber() > ESCAPE_RADIUS_SQUARED) {
      escapeIteration = i;
      // Pad remaining with current value
      for (let j = i + 1; j < maxIterations; j++) {
        orbitData[j * 2] = orbitData[i * 2];
        orbitData[j * 2 + 1] = orbitData[i * 2 + 1];
        magnitudeSquared[j] = magnitudeSquared[i];
      }
      break;
    }

    // z = z² + c
    const sq = complexSquare(zRe, zIm, precision);
    const next = complexAdd(sq.re, sq.im, cRe, cIm, precision);
    zRe = next.re;
    zIm = next.im;
  }

  return {
    centerReStr,
    centerImStr,
    orbitData,
    magnitudeSquared,
    orbitLength: maxIterations,
    escapeIteration,
  };
}
