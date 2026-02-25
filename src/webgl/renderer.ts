import { VERTEX_SHADER, FRAGMENT_SHADER } from "./shaders";
import { computeScale } from "@/core/mandelbrot-math";
import type { ViewerState, Viewport } from "@/core/types";

export interface MandelbrotRenderer {
  updateAndRender(state: ViewerState, viewport: Viewport): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Failed to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${info}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create program");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${info}`);
  }
  return program;
}

export function createMandelbrotRenderer(
  gl: WebGL2RenderingContext
): MandelbrotRenderer {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = createProgram(gl, vs, fs);

  const uCenter = gl.getUniformLocation(program, "u_center");
  const uScale = gl.getUniformLocation(program, "u_scale");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uMaxIterations = gl.getUniformLocation(program, "u_maxIterations");

  // Fullscreen quad: two triangles covering clip space [-1, 1]
  const vertices = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);
  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const aPosition = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  return {
    updateAndRender(state: ViewerState, viewport: Viewport) {
      const scale = computeScale(state.zoom, viewport);

      gl.useProgram(program);
      gl.uniform2f(uCenter, state.centerX, state.centerY);
      gl.uniform1f(uScale, scale);
      gl.uniform2f(uResolution, viewport.width, viewport.height);
      gl.uniform1i(uMaxIterations, state.maxIterations);

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    },

    resize(width: number, height: number) {
      gl.viewport(0, 0, width, height);
    },

    destroy() {
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
