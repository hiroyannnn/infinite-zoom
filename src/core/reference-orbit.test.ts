import { describe, it, expect } from "vitest";
import { computeReferenceOrbit } from "./reference-orbit";

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
