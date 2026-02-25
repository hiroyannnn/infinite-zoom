import type { ReferenceOrbit } from "@/core/types";

export interface OrbitTexture {
  update(orbit: ReferenceOrbit): void;
  bind(unit: number): void;
  getWidth(): number;
  getHeight(): number;
  destroy(): void;
}

function computeTextureDimensions(
  orbitLength: number,
  maxTextureSize: number
): { width: number; height: number } {
  const width = Math.min(orbitLength, maxTextureSize);
  const height = Math.ceil(orbitLength / width);
  return { width, height };
}

export function supportsRGBA32F(gl: WebGL2RenderingContext): boolean {
  const ext = gl.getExtension("EXT_color_buffer_float");
  if (!ext) return false;

  // Probe: try creating a small RGBA32F texture and framebuffer
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 1, 1, 0, gl.RGBA, gl.FLOAT, null);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fb);
  gl.deleteTexture(tex);

  return status === gl.FRAMEBUFFER_COMPLETE;
}

export function createOrbitTexture(
  gl: WebGL2RenderingContext
): OrbitTexture {
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const texture = gl.createTexture();
  if (!texture) throw new Error("Failed to create orbit texture");

  let texWidth = 0;
  let texHeight = 0;

  return {
    update(orbit: ReferenceOrbit) {
      const { width, height } = computeTextureDimensions(
        orbit.orbitLength,
        maxTextureSize
      );
      texWidth = width;
      texHeight = height;

      // Pack orbit data into RGBA: (Z_n.re, Z_n.im, |Z_n|², 0.0)
      const totalTexels = width * height;
      const data = new Float32Array(totalTexels * 4);

      for (let i = 0; i < orbit.orbitLength; i++) {
        data[i * 4] = orbit.orbitData[i * 2];       // re
        data[i * 4 + 1] = orbit.orbitData[i * 2 + 1]; // im
        data[i * 4 + 2] = orbit.magnitudeSquared[i];  // |Z|²
        data[i * 4 + 3] = 0.0;
      }

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        width,
        height,
        0,
        gl.RGBA,
        gl.FLOAT,
        data
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindTexture(gl.TEXTURE_2D, null);
    },

    bind(unit: number) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    },

    getWidth() {
      return texWidth;
    },

    getHeight() {
      return texHeight;
    },

    destroy() {
      gl.deleteTexture(texture);
    },
  };
}
