import { describe, it, expect } from "vitest";
import {
  requiredPrecision,
  createDecimal,
  complexSquare,
  complexAdd,
  complexMagnitudeSquared,
} from "./arbitrary-precision";

describe("requiredPrecision", () => {
  it("returns at least 20 for low zoom", () => {
    expect(requiredPrecision(1)).toBeGreaterThanOrEqual(20);
  });

  it("increases with zoom level", () => {
    const low = requiredPrecision(1e3);
    const high = requiredPrecision(1e10);
    expect(high).toBeGreaterThan(low);
  });

  it("handles very high zoom", () => {
    const p = requiredPrecision(1e50);
    expect(p).toBeGreaterThanOrEqual(60);
  });
});

describe("createDecimal", () => {
  it("creates from number", () => {
    const d = createDecimal(3.14, 20);
    expect(d.toNumber()).toBeCloseTo(3.14, 10);
  });

  it("creates from string with high precision", () => {
    const s = "1.23456789012345678901234567890";
    const d = createDecimal(s, 40);
    // decimal.js trims trailing zeros
    expect(d.toString()).toBe("1.2345678901234567890123456789");
  });

  it("respects precision parameter in operations", () => {
    const a = createDecimal("1.111111111111111111111111111111", 10);
    const b = createDecimal("2.222222222222222222222222222222", 10);
    // Addition should be limited to 10 significant digits of precision
    const sum = a.plus(b);
    expect(sum.toSignificantDigits(10).toString()).toBe("3.333333333");
  });
});

describe("complexSquare", () => {
  it("squares (1+0i) = (1+0i)", () => {
    const result = complexSquare(
      createDecimal(1, 20),
      createDecimal(0, 20),
      20
    );
    expect(result.re.toNumber()).toBeCloseTo(1, 10);
    expect(result.im.toNumber()).toBeCloseTo(0, 10);
  });

  it("squares (0+1i) = (-1+0i)", () => {
    const result = complexSquare(
      createDecimal(0, 20),
      createDecimal(1, 20),
      20
    );
    expect(result.re.toNumber()).toBeCloseTo(-1, 10);
    expect(result.im.toNumber()).toBeCloseTo(0, 10);
  });

  it("squares (1+1i) = (0+2i)", () => {
    const result = complexSquare(
      createDecimal(1, 20),
      createDecimal(1, 20),
      20
    );
    expect(result.re.toNumber()).toBeCloseTo(0, 10);
    expect(result.im.toNumber()).toBeCloseTo(2, 10);
  });

  it("squares (3+4i) = (-7+24i)", () => {
    const result = complexSquare(
      createDecimal(3, 20),
      createDecimal(4, 20),
      20
    );
    expect(result.re.toNumber()).toBeCloseTo(-7, 10);
    expect(result.im.toNumber()).toBeCloseTo(24, 10);
  });
});

describe("complexAdd", () => {
  it("adds two complex numbers", () => {
    const result = complexAdd(
      createDecimal(1, 20),
      createDecimal(2, 20),
      createDecimal(3, 20),
      createDecimal(4, 20),
      20
    );
    expect(result.re.toNumber()).toBeCloseTo(4, 10);
    expect(result.im.toNumber()).toBeCloseTo(6, 10);
  });

  it("preserves high precision", () => {
    const a = "0.12345678901234567890123456789";
    const b = "0.98765432109876543210987654321";
    const result = complexAdd(
      createDecimal(a, 40),
      createDecimal(0, 40),
      createDecimal(b, 40),
      createDecimal(0, 40),
      40
    );
    expect(result.re.toString()).toBe("1.1111111101111111110111111111");
  });
});

describe("complexMagnitudeSquared", () => {
  it("computes |3+4i|^2 = 25", () => {
    const result = complexMagnitudeSquared(
      createDecimal(3, 20),
      createDecimal(4, 20),
      20
    );
    expect(result.toNumber()).toBeCloseTo(25, 10);
  });

  it("computes |0+0i|^2 = 0", () => {
    const result = complexMagnitudeSquared(
      createDecimal(0, 20),
      createDecimal(0, 20),
      20
    );
    expect(result.toNumber()).toBeCloseTo(0, 10);
  });

  it("computes |1+1i|^2 = 2", () => {
    const result = complexMagnitudeSquared(
      createDecimal(1, 20),
      createDecimal(1, 20),
      20
    );
    expect(result.toNumber()).toBeCloseTo(2, 10);
  });
});
