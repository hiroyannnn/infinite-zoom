export interface ViewerState {
  centerX: number;
  centerY: number;
  zoom: number;
  maxIterations: number;
  centerXStr?: string;
  centerYStr?: string;
}

export interface ReferenceOrbit {
  centerReStr: string;
  centerImStr: string;
  orbitData: Float32Array;
  magnitudeSquared: Float32Array;
  orbitLength: number;
  escapeIteration: number;
}

export interface SeriesApproximation {
  skipIterations: number;
  coefficients: Float32Array;
  radius: number;
  order: number;
}

export interface ReferenceOrbitWithSA {
  orbit: ReferenceOrbit;
  sa: SeriesApproximation | null;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}

export interface ComplexPoint {
  re: number;
  im: number;
}
