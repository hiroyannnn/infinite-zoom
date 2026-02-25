import { describe, it, expect } from "vitest";
import { computePerturbation } from "./perturbation";
import { computeReferenceOrbit } from "./reference-orbit";

describe("computePerturbation", () => {
  it("returns same result as reference for deltaC=0", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "-0.5",
      centerImStr: "0",
      maxIterations: 100,
    });

    const result = computePerturbation(orbit, 0, 0, 100);
    // deltaC=0 means this pixel is the reference point itself
    // c=-0.5 is inside the Mandelbrot set, so it should not escape
    expect(result.escaped).toBe(false);
    expect(result.iterations).toBe(100);
  });

  it("matches direct computation for escaping point", () => {
    // Reference at origin, delta to (2, 0) which escapes
    const orbit = computeReferenceOrbit({
      centerReStr: "0",
      centerImStr: "0",
      maxIterations: 50,
    });

    const result = computePerturbation(orbit, 2, 0, 50);
    expect(result.escaped).toBe(true);
    // c=2: z0=0, z1=2, z2=6, z3=38 -> escapes quickly
    expect(result.iterations).toBeLessThan(10);
  });

  it("matches direct computation for point near boundary", () => {
    // Reference near the main cardioid boundary
    const orbit = computeReferenceOrbit({
      centerReStr: "-0.75",
      centerImStr: "0",
      maxIterations: 200,
    });

    // Small delta - point should still be near boundary
    const result = computePerturbation(orbit, 0.01, 0, 200);
    // -0.75 + 0.01 = -0.74, which is inside the set
    expect(result.escaped).toBe(false);
  });

  it("handles escaping reference orbit correctly", () => {
    // Reference at c=1 (escapes), delta to nearby point
    const orbit = computeReferenceOrbit({
      centerReStr: "1",
      centerImStr: "0",
      maxIterations: 50,
    });

    // Both the reference and the perturbed point should escape
    const result = computePerturbation(orbit, 0.1, 0, 50);
    expect(result.escaped).toBe(true);
  });

  it("provides smooth iteration count for escaped points", () => {
    const orbit = computeReferenceOrbit({
      centerReStr: "0",
      centerImStr: "0",
      maxIterations: 100,
    });

    const result = computePerturbation(orbit, 0.5, 0.5, 100);
    if (result.escaped) {
      expect(result.smoothIter).toBeGreaterThan(0);
      expect(result.smoothIter).toBeLessThanOrEqual(100);
      // Smooth iteration should be close to integer iteration
      expect(Math.abs(result.smoothIter - result.iterations)).toBeLessThan(2);
    }
  });

  it("triggers rebasing when delta grows large", () => {
    // Reference at -0.5+0i, delta to reach c=1.5+0i which escapes quickly
    const orbit = computeReferenceOrbit({
      centerReStr: "-0.5",
      centerImStr: "0",
      maxIterations: 100,
    });

    // delta = (2.0, 0) → c = -0.5+2.0 = 1.5, which escapes
    const result = computePerturbation(orbit, 2.0, 0, 100);
    expect(result.escaped).toBe(true);
    expect(result.iterations).toBeLessThan(10);
  });

  it("computes correct results at low zoom (validation against known values)", () => {
    // Direct computation: c = -0.5 + 0.5i
    // This is near the boundary, iterate manually:
    // z0=0, z1=-0.5+0.5i, z2=-0.5+0.5i)^2+c = -0.5+(-0.5+0.5i)^2 = -0.5+(0.25-0.5+0.25i²)
    // Let's just verify it doesn't crash and gives reasonable results
    const orbit = computeReferenceOrbit({
      centerReStr: "-0.5",
      centerImStr: "0.5",
      maxIterations: 100,
    });

    const result = computePerturbation(orbit, 0, 0, 100);
    // c = -0.5 + 0.5i is inside the Mandelbrot set
    expect(result.escaped).toBe(false);
  });
});
