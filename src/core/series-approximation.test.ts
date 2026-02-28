import { describe, it, expect } from "vitest";
import {
  createSAState,
  updateSACoefficients,
  isSAValid,
  extractNormalizedCoefficients,
} from "./series-approximation";

describe("createSAState", () => {
  it("initializes all coefficients to zero", () => {
    const state = createSAState(12);
    expect(state.coeffRe.length).toBe(12);
    expect(state.coeffIm.length).toBe(12);
    for (let k = 0; k < 12; k++) {
      expect(state.coeffRe[k]).toBe(0);
      expect(state.coeffIm[k]).toBe(0);
    }
  });
});

describe("updateSACoefficients", () => {
  it("computes A_1 correctly for c=0 (Z_n=0 for all n)", () => {
    const state = createSAState(4);
    // A_1(0) = 0
    // A_1(n+1) = 2*Z_n*A_1(n) + 1 = 2*0*0 + 1 = 1
    updateSACoefficients(state, 0, 0, 4);
    expect(state.coeffRe[0]).toBeCloseTo(1, 10); // A_1(1) = 1
    expect(state.coeffIm[0]).toBeCloseTo(0, 10);

    updateSACoefficients(state, 0, 0, 4);
    expect(state.coeffRe[0]).toBeCloseTo(1, 10); // A_1(2) = 2*0*1+1 = 1
  });

  it("computes A_2 correctly for c=0", () => {
    const state = createSAState(4);
    // Step 0→1: A_1(1)=1, A_2(1)=2*0*0+A_1(0)*A_1(0)=0
    updateSACoefficients(state, 0, 0, 4);
    expect(state.coeffRe[1]).toBeCloseTo(0, 10); // A_2(1) = 0

    // Step 1→2: A_2(2)=2*0*0+A_1(1)*A_1(1)=1*1=1
    updateSACoefficients(state, 0, 0, 4);
    expect(state.coeffRe[1]).toBeCloseTo(1, 10); // A_2(2) = 1
  });

  it("computes correctly for Z_n = 1+0i", () => {
    const state = createSAState(3);
    // Z_n = 1, A_k(0) = 0 for all k
    // Step 0→1: A_1(1) = 2*1*0 + 1 = 1
    updateSACoefficients(state, 1, 0, 3);
    expect(state.coeffRe[0]).toBeCloseTo(1, 10);

    // Step 1→2: A_1(2) = 2*1*1 + 1 = 3
    //           A_2(2) = 2*1*0 + A_1(1)*A_1(1) = 1
    updateSACoefficients(state, 1, 0, 3);
    expect(state.coeffRe[0]).toBeCloseTo(3, 10); // A_1(2) = 3
    expect(state.coeffRe[1]).toBeCloseTo(1, 10); // A_2(2) = 1
  });

  it("handles complex Z_n correctly", () => {
    const state = createSAState(2);
    // Z_n = 0 + 1i
    // A_1(1) = 2*(0+i)*0 + 1 = 1
    updateSACoefficients(state, 0, 1, 2);
    expect(state.coeffRe[0]).toBeCloseTo(1, 10);
    expect(state.coeffIm[0]).toBeCloseTo(0, 10);

    // A_1(2) = 2*(0+i)*1 + 1 = 1 + 2i
    updateSACoefficients(state, 0, 1, 2);
    expect(state.coeffRe[0]).toBeCloseTo(1, 10);
    expect(state.coeffIm[0]).toBeCloseTo(2, 10);
  });
});

describe("isSAValid", () => {
  it("returns true for small radius", () => {
    const state = createSAState(4);
    // After a few updates, coefficients are reasonable
    updateSACoefficients(state, 0, 0, 4); // step 1
    updateSACoefficients(state, 0, 0, 4); // step 2

    // Small radius → SA is valid
    const valid = isSAValid(state, 0, 1e-10, 4);
    expect(valid).toBe(true);
  });

  it("returns false for large radius", () => {
    const state = createSAState(4);
    updateSACoefficients(state, 0, 0, 4);
    updateSACoefficients(state, 0, 0, 4);

    // Very large radius → SA would overflow
    const valid = isSAValid(state, 1.5, 1e10, 4);
    expect(valid).toBe(false);
  });

  it("returns false when Z_n magnitude is close to escape", () => {
    const state = createSAState(4);
    updateSACoefficients(state, 0, 0, 4);

    // Z_n magnitude close to 2 → no room for SA error
    const valid = isSAValid(state, 1.99, 1e-5, 4);
    expect(valid).toBe(false);
  });
});

describe("extractNormalizedCoefficients", () => {
  it("returns Float32Array of correct length", () => {
    const state = createSAState(4);
    updateSACoefficients(state, 0, 0, 4);

    const result = extractNormalizedCoefficients(state, 0.01, 4);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(4 * 2); // order * 2 (re, im pairs)
  });

  it("applies radius normalization correctly", () => {
    const state = createSAState(2);
    // Set up known coefficients: A_1 = 1+0i, A_2 = 0
    updateSACoefficients(state, 0, 0, 2);
    // After 1 step: A_1 = 1+0i

    const r = 0.5;
    const result = extractNormalizedCoefficients(state, r, 2);
    // B_1 = A_1 * r^1 = 1 * 0.5 = 0.5
    expect(result[0]).toBeCloseTo(0.5, 5); // B_1.re
    expect(result[1]).toBeCloseTo(0, 5);   // B_1.im
    // B_2 = A_2 * r^2 = 0 * 0.25 = 0
    expect(result[2]).toBeCloseTo(0, 5);   // B_2.re
    expect(result[3]).toBeCloseTo(0, 5);   // B_2.im
  });
});
