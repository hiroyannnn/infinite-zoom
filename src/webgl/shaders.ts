export const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_center;
uniform float u_scale;
uniform vec2 u_resolution;
uniform int u_maxIterations;

out vec4 fragColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.1, 0.2)));
}

void main() {
  vec2 uv = gl_FragCoord.xy;

  float re = u_center.x + (uv.x - u_resolution.x * 0.5) * u_scale;
  float im = u_center.y + (uv.y - u_resolution.y * 0.5) * u_scale;

  float zr = 0.0, zi = 0.0;
  float zr2 = 0.0, zi2 = 0.0;
  int iter = 0;

  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIterations) break;
    if (zr2 + zi2 > 4.0) break;

    zi = 2.0 * zr * zi + im;
    zr = zr2 - zi2 + re;
    zr2 = zr * zr;
    zi2 = zi * zi;
    iter = i + 1;
  }

  if (iter >= u_maxIterations) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smoothIter = float(iter) + 1.0 - log(log(sqrt(zr2 + zi2))) / log(2.0);
    float t = smoothIter / float(u_maxIterations);
    fragColor = vec4(palette(t * 5.0), 1.0);
  }
}
`;

export const PERTURBATION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_scale;
uniform int u_maxIterations;
uniform int u_orbitLength;
uniform int u_orbitTexWidth;
uniform int u_escapeIteration;

// Double-single precision delta: δc = hi + lo
uniform vec2 u_deltaCenterHi;
uniform vec2 u_deltaCenterLo;

uniform highp sampler2D u_orbitTexture;

out vec4 fragColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.1, 0.2)));
}

vec4 getOrbitData(int n) {
  int x = n % u_orbitTexWidth;
  int y = n / u_orbitTexWidth;
  return texelFetch(u_orbitTexture, ivec2(x, y), 0);
}

// Double-single addition: (aHi + aLo) + (bHi + bLo) = (sHi + sLo)
vec2 dsAdd(float aHi, float aLo, float bHi, float bLo) {
  float s = aHi + bHi;
  float v = s - aHi;
  float err = (aHi - (s - v)) + (bHi - v);
  float lo = aLo + bLo + err;
  return vec2(s + lo, lo - ((s + lo) - s));
}

void main() {
  vec2 uv = gl_FragCoord.xy;
  vec2 pixelOffset = (uv - u_resolution * 0.5) * u_scale;

  // Add pixel offset to δc using double-single addition
  vec2 dcReDS = dsAdd(u_deltaCenterHi.x, u_deltaCenterLo.x, pixelOffset.x, 0.0);
  vec2 dcImDS = dsAdd(u_deltaCenterHi.y, u_deltaCenterLo.y, pixelOffset.y, 0.0);

  float dcRe = dcReDS.x;
  float dcIm = dcImDS.x;

  float dzRe = 0.0;
  float dzIm = 0.0;
  int n = 0;
  int iter = 0;
  float finalMagSq = 0.0;

  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIterations) break;
    if (n >= u_orbitLength) break;

    vec4 orbitVal = getOrbitData(n);
    float ZnRe = orbitVal.x;
    float ZnIm = orbitVal.y;
    float ZnMagSq = orbitVal.z;

    // Full z = Z_n + δz_n
    float fullRe = ZnRe + dzRe;
    float fullIm = ZnIm + dzIm;
    float fullMagSq = fullRe * fullRe + fullIm * fullIm;

    // Escape check
    if (fullMagSq > 4.0) {
      finalMagSq = fullMagSq;
      iter = i;
      break;
    }

    // Rebasing: if |δz|² > |Z_n|² and Z_n is not near zero
    float dzMagSq = dzRe * dzRe + dzIm * dzIm;
    if (n > 0 && dzMagSq > ZnMagSq && ZnMagSq > 1e-10) {
      dzRe = fullRe;
      dzIm = fullIm;
      n = 0;
      continue;
    }

    // δz_{n+1} = 2·Z_n·δz_n + δz_n² + δc
    float twoZdzRe = 2.0 * (ZnRe * dzRe - ZnIm * dzIm);
    float twoZdzIm = 2.0 * (ZnRe * dzIm + ZnIm * dzRe);

    float dzSqRe = dzRe * dzRe - dzIm * dzIm;
    float dzSqIm = 2.0 * dzRe * dzIm;

    dzRe = twoZdzRe + dzSqRe + dcRe;
    dzIm = twoZdzIm + dzSqIm + dcIm;

    n++;
    iter = i + 1;
  }

  if (iter >= u_maxIterations || finalMagSq <= 4.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smoothIter = float(iter) + 1.0 - log(log(sqrt(finalMagSq))) / log(2.0);
    float t = smoothIter / float(u_maxIterations);
    fragColor = vec4(palette(t * 5.0), 1.0);
  }
}
`;
