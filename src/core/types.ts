export interface ViewerState {
  centerX: number;
  centerY: number;
  zoom: number;
  maxIterations: number;
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
