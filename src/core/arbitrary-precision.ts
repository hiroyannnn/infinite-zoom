import Decimal from "decimal.js";

export type { Decimal };

export function requiredPrecision(zoom: number): number {
  return Math.max(20, Math.ceil(Math.log10(Math.max(zoom, 1))) + 15);
}

export function createDecimal(
  value: number | string,
  precision: number
): Decimal {
  Decimal.set({ precision });
  return new Decimal(value);
}

export function complexSquare(
  re: Decimal,
  im: Decimal,
  precision: number
): { re: Decimal; im: Decimal } {
  Decimal.set({ precision });
  return {
    re: re.mul(re).minus(im.mul(im)),
    im: re.mul(im).mul(2),
  };
}

export function complexAdd(
  aRe: Decimal,
  aIm: Decimal,
  bRe: Decimal,
  bIm: Decimal,
  precision: number
): { re: Decimal; im: Decimal } {
  Decimal.set({ precision });
  return {
    re: aRe.plus(bRe),
    im: aIm.plus(bIm),
  };
}

export function complexMagnitudeSquared(
  re: Decimal,
  im: Decimal,
  precision: number
): Decimal {
  Decimal.set({ precision });
  return re.mul(re).plus(im.mul(im));
}
