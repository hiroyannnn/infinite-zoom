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
