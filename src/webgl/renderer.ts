import {
  VERTEX_SHADER,
  FRAGMENT_SHADER,
  PERTURBATION_FRAGMENT_SHADER,
  SA_MAX_ORDER,
} from "./shaders";
import { computeScale, splitDoubleSingle } from "@/core/mandelbrot-math";
import { createOrbitTexture, type OrbitTexture } from "./orbit-texture";
import type {
  ViewerState,
  Viewport,
  ReferenceOrbit,
  SeriesApproximation,
} from "@/core/types";

const ZOOM_THRESHOLD_IN = 1e6;
const ZOOM_THRESHOLD_OUT = 5e5;

export interface MandelbrotRenderer {
  updateAndRender(state: ViewerState, viewport: Viewport): void;
  updateReferenceOrbit(orbit: ReferenceOrbit): void;
  updateSeriesApproximation(sa: SeriesApproximation | null): void;
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

function setupQuad(gl: WebGL2RenderingContext, program: WebGLProgram) {
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

  return { vao, vbo };
}

export function createMandelbrotRenderer(
  gl: WebGL2RenderingContext
): MandelbrotRenderer {
  // Direct shader program
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const directFs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const directProgram = createProgram(gl, vs, directFs);
  const directQuad = setupQuad(gl, directProgram);

  const directUniforms = {
    center: gl.getUniformLocation(directProgram, "u_center"),
    scale: gl.getUniformLocation(directProgram, "u_scale"),
    resolution: gl.getUniformLocation(directProgram, "u_resolution"),
    maxIterations: gl.getUniformLocation(directProgram, "u_maxIterations"),
  };

  // Perturbation shader program
  const perturbFs = compileShader(
    gl,
    gl.FRAGMENT_SHADER,
    PERTURBATION_FRAGMENT_SHADER
  );
  const perturbProgram = createProgram(gl, vs, perturbFs);
  const perturbQuad = setupQuad(gl, perturbProgram);

  const perturbUniforms = {
    resolution: gl.getUniformLocation(perturbProgram, "u_resolution"),
    scale: gl.getUniformLocation(perturbProgram, "u_scale"),
    maxIterations: gl.getUniformLocation(perturbProgram, "u_maxIterations"),
    orbitLength: gl.getUniformLocation(perturbProgram, "u_orbitLength"),
    orbitTexWidth: gl.getUniformLocation(perturbProgram, "u_orbitTexWidth"),
    escapeIteration: gl.getUniformLocation(perturbProgram, "u_escapeIteration"),
    deltaCenterHi: gl.getUniformLocation(perturbProgram, "u_deltaCenterHi"),
    deltaCenterLo: gl.getUniformLocation(perturbProgram, "u_deltaCenterLo"),
    orbitTexture: gl.getUniformLocation(perturbProgram, "u_orbitTexture"),
    saSkip: gl.getUniformLocation(perturbProgram, "u_saSkip"),
    saInvRadius: gl.getUniformLocation(perturbProgram, "u_saInvRadius"),
    saCoeff: Array.from({ length: SA_MAX_ORDER }, (_, i) =>
      gl.getUniformLocation(perturbProgram, `u_saCoeff[${i}]`)
    ),
  };

  const orbitTex: OrbitTexture = createOrbitTexture(gl);
  let currentOrbit: ReferenceOrbit | null = null;
  let currentSA: SeriesApproximation | null = null;
  let usePerturbation = false;

  function renderDirect(state: ViewerState, viewport: Viewport) {
    const scale = computeScale(state.zoom, viewport);
    gl.useProgram(directProgram);
    gl.uniform2f(directUniforms.center, state.centerX, state.centerY);
    gl.uniform1f(directUniforms.scale, scale);
    gl.uniform2f(directUniforms.resolution, viewport.width, viewport.height);
    gl.uniform1i(directUniforms.maxIterations, state.maxIterations);

    gl.bindVertexArray(directQuad.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  function renderPerturbation(
    state: ViewerState,
    viewport: Viewport,
    orbit: ReferenceOrbit
  ) {
    const scale = computeScale(state.zoom, viewport);

    // Compute δc = (state.center - orbit.center)
    // Use centerXStr for precision if available
    const refCenterRe = Number(orbit.centerReStr);
    const refCenterIm = Number(orbit.centerImStr);
    const deltaRe = state.centerX - refCenterRe;
    const deltaIm = state.centerY - refCenterIm;
    const deltaReDS = splitDoubleSingle(deltaRe);
    const deltaImDS = splitDoubleSingle(deltaIm);

    gl.useProgram(perturbProgram);
    gl.uniform2f(perturbUniforms.resolution, viewport.width, viewport.height);
    gl.uniform1f(perturbUniforms.scale, scale);
    gl.uniform1i(perturbUniforms.maxIterations, state.maxIterations);
    gl.uniform1i(perturbUniforms.orbitLength, orbit.orbitLength);
    gl.uniform1i(perturbUniforms.orbitTexWidth, orbitTex.getWidth());
    gl.uniform1i(perturbUniforms.escapeIteration, orbit.escapeIteration);
    gl.uniform2f(
      perturbUniforms.deltaCenterHi,
      deltaReDS.hi,
      deltaImDS.hi
    );
    gl.uniform2f(
      perturbUniforms.deltaCenterLo,
      deltaReDS.lo,
      deltaImDS.lo
    );

    // SA uniforms
    if (currentSA && currentSA.skipIterations > 0) {
      gl.uniform1i(perturbUniforms.saSkip, currentSA.skipIterations);
      gl.uniform1f(perturbUniforms.saInvRadius, 1.0 / currentSA.radius);
      for (let i = 0; i < SA_MAX_ORDER; i++) {
        if (i < currentSA.order) {
          gl.uniform2f(
            perturbUniforms.saCoeff[i],
            currentSA.coefficients[i * 2],
            currentSA.coefficients[i * 2 + 1]
          );
        } else {
          gl.uniform2f(perturbUniforms.saCoeff[i], 0.0, 0.0);
        }
      }
    } else {
      gl.uniform1i(perturbUniforms.saSkip, 0);
    }

    orbitTex.bind(0);
    gl.uniform1i(perturbUniforms.orbitTexture, 0);

    gl.bindVertexArray(perturbQuad.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  return {
    updateAndRender(state: ViewerState, viewport: Viewport) {
      // Hysteresis switching
      if (usePerturbation) {
        if (state.zoom < ZOOM_THRESHOLD_OUT) {
          usePerturbation = false;
        }
      } else {
        if (state.zoom >= ZOOM_THRESHOLD_IN && currentOrbit) {
          usePerturbation = true;
        }
      }

      if (usePerturbation && currentOrbit) {
        renderPerturbation(state, viewport, currentOrbit);
      } else {
        renderDirect(state, viewport);
      }
    },

    updateReferenceOrbit(orbit: ReferenceOrbit) {
      currentOrbit = orbit;
      orbitTex.update(orbit);
    },

    updateSeriesApproximation(sa: SeriesApproximation | null) {
      currentSA = sa;
    },

    resize(width: number, height: number) {
      gl.viewport(0, 0, width, height);
    },

    destroy() {
      orbitTex.destroy();
      gl.deleteBuffer(directQuad.vbo);
      gl.deleteVertexArray(directQuad.vao);
      gl.deleteBuffer(perturbQuad.vbo);
      gl.deleteVertexArray(perturbQuad.vao);
      gl.deleteProgram(directProgram);
      gl.deleteProgram(perturbProgram);
      gl.deleteShader(vs);
      gl.deleteShader(directFs);
      gl.deleteShader(perturbFs);
    },
  };
}
