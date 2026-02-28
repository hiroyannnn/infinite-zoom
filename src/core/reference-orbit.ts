import {
  createDecimal,
  complexSquare,
  complexAdd,
  complexMagnitudeSquared,
  requiredPrecision,
} from "./arbitrary-precision";
import type { ReferenceOrbit, ReferenceOrbitWithSA } from "./types";
import {
  createSAState,
  updateSACoefficients,
  isSAValid,
  extractNormalizedCoefficients,
} from "./series-approximation";

const ESCAPE_RADIUS_SQUARED = 1024 * 1024;

interface ComputeReferenceOrbitParams {
  centerReStr: string;
  centerImStr: string;
  maxIterations: number;
  zoom?: number;
}

interface ComputeReferenceOrbitWithSAParams extends ComputeReferenceOrbitParams {
  viewportRadius?: number;
  saOrder?: number;
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

const DEFAULT_SA_ORDER = 12;

export function computeReferenceOrbitWithSA(
  params: ComputeReferenceOrbitWithSAParams
): ReferenceOrbitWithSA {
  const {
    centerReStr,
    centerImStr,
    maxIterations,
    zoom = 1,
    viewportRadius,
    saOrder = DEFAULT_SA_ORDER,
  } = params;

  const precision = requiredPrecision(zoom);
  const cRe = createDecimal(centerReStr, precision);
  const cIm = createDecimal(centerImStr, precision);

  const orbitData = new Float32Array(maxIterations * 2);
  const magnitudeSquared = new Float32Array(maxIterations);

  let zRe = createDecimal(0, precision);
  let zIm = createDecimal(0, precision);
  let escapeIteration = -1;

  // SA state (only initialized if viewportRadius is provided)
  const computeSA = viewportRadius !== undefined && viewportRadius > 0;
  const saState = computeSA ? createSAState(saOrder) : null;
  let bestSAIteration = 0;

  for (let i = 0; i < maxIterations; i++) {
    const znReNum = zRe.toNumber();
    const znImNum = zIm.toNumber();

    orbitData[i * 2] = znReNum;
    orbitData[i * 2 + 1] = znImNum;
    const magSq = complexMagnitudeSquared(zRe, zIm, precision);
    const magSqNum = magSq.toNumber();
    magnitudeSquared[i] = magSqNum;

    if (escapeIteration === -1 && magSqNum > ESCAPE_RADIUS_SQUARED) {
      escapeIteration = i;
      for (let j = i + 1; j < maxIterations; j++) {
        orbitData[j * 2] = orbitData[i * 2];
        orbitData[j * 2 + 1] = orbitData[i * 2 + 1];
        magnitudeSquared[j] = magnitudeSquared[i];
      }
      break;
    }

    // Update SA coefficients alongside orbit
    if (saState && escapeIteration === -1) {
      updateSACoefficients(saState, znReNum, znImNum, saOrder);

      const znMag = Math.sqrt(magSqNum);
      if (
        i < maxIterations - 1 &&
        isSAValid(saState, znMag, viewportRadius!, saOrder)
      ) {
        bestSAIteration = i + 1; // iteration count (1-indexed)
      }
    }

    // z = z² + c
    const sq = complexSquare(zRe, zIm, precision);
    const next = complexAdd(sq.re, sq.im, cRe, cIm, precision);
    zRe = next.re;
    zIm = next.im;
  }

  const orbit: ReferenceOrbit = {
    centerReStr,
    centerImStr,
    orbitData,
    magnitudeSquared,
    orbitLength: maxIterations,
    escapeIteration,
  };

  let sa = null;
  if (computeSA && bestSAIteration > 0) {
    // Re-compute SA state up to bestSAIteration to extract coefficients at that point
    const finalSAState = createSAState(saOrder);
    for (let i = 0; i < bestSAIteration; i++) {
      const znRe = orbitData[i * 2];
      const znIm = orbitData[i * 2 + 1];
      updateSACoefficients(finalSAState, znRe, znIm, saOrder);
    }

    sa = {
      skipIterations: bestSAIteration,
      coefficients: extractNormalizedCoefficients(
        finalSAState,
        viewportRadius!,
        saOrder
      ),
      radius: viewportRadius!,
      order: saOrder,
    };
  }

  return { orbit, sa };
}
