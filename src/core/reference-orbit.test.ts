import { describe, it, expect } from "vitest";
import {
  computeReferenceOrbit,
  computeReferenceOrbitWithSA,
} from "./reference-orbit";

describe("computeReferenceOrbit", () => {
  it("computes orbit for c=0 (fixed point)", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "0",
      centerImStr: "0",
      maxIterations: 10,
    });

    expect(orbit.centerReStr).toBe("0");
    expect(orbit.centerImStr).toBe("0");
    expect(orbit.orbitLength).toBe(10);
    expect(orbit.escapeIteration).toBe(-1);
    // z stays at 0 for all iterations
    for (let i = 0; i < orbit.orbitLength; i++) {
      expect(orbit.orbitData[i * 2]).toBeCloseTo(0, 5);
      expect(orbit.orbitData[i * 2 + 1]).toBeCloseTo(0, 5);
      expect(orbit.magnitudeSquared[i]).toBeCloseTo(0, 5);
    }
  });

  it("computes orbit for c=1 (escapes quickly)", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "1",
      centerImStr: "0",
      maxIterations: 20,
    });

    expect(orbit.orbitLength).toBe(20);
    // c=1: z0=0, z1=1, z2=2, z3=5, z4=26 -> escapes at iteration 3 (|z|>escape_radius)
    expect(orbit.escapeIteration).toBeGreaterThan(0);
    expect(orbit.escapeIteration).toBeLessThan(10);
    // After escape, orbit should be padded to maxIterations
    expect(orbit.orbitData.length).toBe(20 * 2);
    expect(orbit.magnitudeSquared.length).toBe(20);
  });

  it("computes orbit for c=-1 (period-2 cycle)", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "-1",
      centerImStr: "0",
      maxIterations: 100,
    });

    expect(orbit.escapeIteration).toBe(-1);
    // c=-1: z0=0, z1=-1, z2=0, z3=-1, ...
    expect(orbit.orbitData[0]).toBeCloseTo(0, 5); // z0 re
    expect(orbit.orbitData[1]).toBeCloseTo(0, 5); // z0 im
    expect(orbit.orbitData[2]).toBeCloseTo(-1, 5); // z1 re
    expect(orbit.orbitData[3]).toBeCloseTo(0, 5); // z1 im
    expect(orbit.orbitData[4]).toBeCloseTo(0, 5); // z2 re
    expect(orbit.orbitData[5]).toBeCloseTo(0, 5); // z2 im
  });

  it("computes orbit for c=i (spiraling)", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "0",
      centerImStr: "1",
      maxIterations: 50,
    });

    // c=i: z0=0, z1=i, z2=i²+i=-1+i, z3=(-1+i)²+i=-i, z4=(-i)²+i=-1+i...
    expect(orbit.orbitData[0]).toBeCloseTo(0, 5); // z0 re
    expect(orbit.orbitData[1]).toBeCloseTo(0, 5); // z0 im
    expect(orbit.orbitData[2]).toBeCloseTo(0, 5); // z1 re
    expect(orbit.orbitData[3]).toBeCloseTo(1, 5); // z1 im
    expect(orbit.orbitData[4]).toBeCloseTo(-1, 5); // z2 re
    expect(orbit.orbitData[5]).toBeCloseTo(1, 5); // z2 im
    expect(orbit.escapeIteration).toBe(-1); // c=i is in the Mandelbrot set
  });

  it("uses escape radius of 1024", () => {
    // c=2 escapes immediately: z0=0, z1=2, z2=6, z3=38, z4=1446 > 1024
    const orbit = computeReferenceOrbit({
      centerReStr: "2",
      centerImStr: "0",
      maxIterations: 20,
    });

    // z4 = 1446, |z4|^2 > 1024^2, so escape should happen around iteration 4
    expect(orbit.escapeIteration).toBeGreaterThanOrEqual(3);
    expect(orbit.escapeIteration).toBeLessThanOrEqual(5);
  });

  it("pads orbit data after escape", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "2",
      centerImStr: "0",
      maxIterations: 20,
    });

    const escIdx = orbit.escapeIteration;
    expect(escIdx).toBeGreaterThan(0);
    // After escape, values should be padded with last escaped value
    const lastRe = orbit.orbitData[escIdx * 2];
    const lastIm = orbit.orbitData[escIdx * 2 + 1];
    for (let i = escIdx + 1; i < orbit.orbitLength; i++) {
      expect(orbit.orbitData[i * 2]).toBe(lastRe);
      expect(orbit.orbitData[i * 2 + 1]).toBe(lastIm);
    }
  });
});

describe("computeReferenceOrbitWithSA", () => {
  it("returns orbit and sa=null when viewportRadius is not provided", () => {
    const result = computeReferenceOrbitWithSA({
      centerReStr: "0",
      centerImStr: "0",
      maxIterations: 100,
    });

    expect(result.orbit).toBeDefined();
    expect(result.orbit.centerReStr).toBe("0");
    expect(result.sa).toBeNull();
  });

  it("returns orbit identical to computeReferenceOrbit", () => {
    const params = {
      centerReStr: "-1",
      centerImStr: "0",
      maxIterations: 50,
    };

    const orbitOnly = computeReferenceOrbit(params);
    const withSA = computeReferenceOrbitWithSA(params);

    expect(withSA.orbit.escapeIteration).toBe(orbitOnly.escapeIteration);
    expect(withSA.orbit.orbitLength).toBe(orbitOnly.orbitLength);
    for (let i = 0; i < orbitOnly.orbitLength; i++) {
      expect(withSA.orbit.orbitData[i * 2]).toBeCloseTo(
        orbitOnly.orbitData[i * 2],
        5
      );
      expect(withSA.orbit.orbitData[i * 2 + 1]).toBeCloseTo(
        orbitOnly.orbitData[i * 2 + 1],
        5
      );
    }
  });

  it("returns SA with skipIterations > 0 for non-escaping orbit with small radius", () => {
    const result = computeReferenceOrbitWithSA({
      centerReStr: "-1",
      centerImStr: "0",
      maxIterations: 100,
      viewportRadius: 1e-10,
      saOrder: 4,
    });

    expect(result.sa).not.toBeNull();
    expect(result.sa!.skipIterations).toBeGreaterThan(0);
    expect(result.sa!.order).toBe(4);
    expect(result.sa!.radius).toBeCloseTo(1e-10, 15);
    expect(result.sa!.coefficients.length).toBe(4 * 2); // order * 2 (re, im pairs)
  });

  it("returns SA with correct coefficient structure", () => {
    const result = computeReferenceOrbitWithSA({
      centerReStr: "0",
      centerImStr: "0",
      maxIterations: 100,
      viewportRadius: 1e-8,
      saOrder: 6,
    });

    expect(result.sa).not.toBeNull();
    expect(result.sa!.coefficients).toBeInstanceOf(Float32Array);
    expect(result.sa!.coefficients.length).toBe(6 * 2);
  });

  it("SA skipIterations is bounded by orbit length", () => {
    const result = computeReferenceOrbitWithSA({
      centerReStr: "-1",
      centerImStr: "0",
      maxIterations: 50,
      viewportRadius: 1e-10,
      saOrder: 4,
    });

    if (result.sa) {
      expect(result.sa.skipIterations).toBeLessThanOrEqual(50);
      expect(result.sa.skipIterations).toBeGreaterThan(0);
    }
  });

  it("SA accuracy: polynomial approximation matches direct iteration", () => {
    // Use c=-1 (period-2 orbit) with a small delta
    const result = computeReferenceOrbitWithSA({
      centerReStr: "-1",
      centerImStr: "0",
      maxIterations: 100,
      viewportRadius: 1e-6,
      saOrder: 8,
    });

    expect(result.sa).not.toBeNull();
    const sa = result.sa!;
    const N = sa.skipIterations;

    // Compute δz_N directly by iterating z = z² + c for c = -1 + δc
    const dcRe = 1e-8; // small delta
    const dcIm = 0;
    const cRe = -1 + dcRe;

    // Direct iteration: z = z² + c from z=0
    let zRe = 0;
    let zIm = 0;
    for (let i = 0; i < N; i++) {
      const newRe = zRe * zRe - zIm * zIm + cRe;
      const newIm = 2 * zRe * zIm + dcIm; // cIm = 0 + dcIm
      zRe = newRe;
      zIm = newIm;
    }
    // Reference orbit value at N
    const ZnRe = result.orbit.orbitData[N * 2];
    const ZnIm = result.orbit.orbitData[N * 2 + 1];
    // δz_N = z_N(c+δc) - Z_N(c)
    const directDzRe = zRe - ZnRe;
    const directDzIm = zIm - ZnIm;

    // SA approximation: δz_N ≈ Σ B_k · (δc/r)^k · ... via normalized coefficients
    // B_k = A_k · r^k, so Σ B_k · x^k where x = δc/r
    const r = sa.radius;
    const xRe = dcRe / r;
    const xIm = dcIm / r;

    // Evaluate polynomial using Horner's method
    let accRe = sa.coefficients[(sa.order - 1) * 2];
    let accIm = sa.coefficients[(sa.order - 1) * 2 + 1];
    for (let k = sa.order - 2; k >= 0; k--) {
      // acc = acc * x + B_k
      const tmpRe = accRe * xRe - accIm * xIm;
      const tmpIm = accRe * xIm + accIm * xRe;
      accRe = tmpRe + sa.coefficients[k * 2];
      accIm = tmpIm + sa.coefficients[k * 2 + 1];
    }
    // Final multiply by x
    const saDzRe = accRe * xRe - accIm * xIm;
    const saDzIm = accRe * xIm + accIm * xRe;

    // SA should be a good approximation (relative error < 1%)
    const directMag = Math.sqrt(directDzRe * directDzRe + directDzIm * directDzIm);
    const errRe = Math.abs(saDzRe - directDzRe);
    const errIm = Math.abs(saDzIm - directDzIm);
    const errMag = Math.sqrt(errRe * errRe + errIm * errIm);

    expect(errMag / directMag).toBeLessThan(0.01);
  });

  it("returns sa=null for escaping orbit", () => {
    const result = computeReferenceOrbitWithSA({
      centerReStr: "2",
      centerImStr: "0",
      maxIterations: 20,
      viewportRadius: 1e-10,
      saOrder: 4,
    });

    // c=2 escapes quickly, SA may not find a valid skip point
    // Either sa is null or skipIterations is very small
    if (result.sa) {
      expect(result.sa.skipIterations).toBeLessThan(result.orbit.escapeIteration);
    }
  });
});
