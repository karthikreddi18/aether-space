import * as THREE from 'three';

export const starVertexShader = `
  uniform float time;
  uniform float pixelRatio;
  attribute float size;
  attribute float brightness;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vColor = color;
    vBrightness = brightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float twinkle = sin(time * 2.0 + position.x * 10.0) * 0.5 + 0.5;
    float finalSize = size * (0.6 + twinkle * 0.8) * pixelRatio;
    gl_PointSize = finalSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const starFragmentShader = `
  varying vec3 vColor;
  varying float vBrightness;
  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    vec3 color = vColor * (0.7 + vBrightness * 0.6);
    color = mix(color, vec3(0.95, 0.98, 1.0), core * 0.6);
    gl_FragColor = vec4(color, alpha * (0.65 + vBrightness * 0.35));
  }
`;

export const nebulaVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nebulaFragmentShader = `
  uniform float time;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform vec3 color3;
  uniform float density;
  uniform float speed;
  varying vec2 vUv;
  varying vec3 vPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) { 
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      value += amplitude * snoise(p * frequency);
      p *= 2.0;
      amplitude *= 0.5;
      frequency *= 1.8;
    }
    return value;
  }

  void main() {
    vec3 pos = vPosition * 0.008 + vec3(time * speed * 0.03);
    float n1 = fbm(pos);
    float n2 = fbm(pos * 1.7 + vec3(12.3, 45.6, 78.9));
    float combined = (n1 * 0.6 + n2 * 0.3) * density;
    float alpha = smoothstep(-0.3, 0.8, combined) * 0.85;
    alpha *= smoothstep(1.2, 0.3, length(vUv - 0.5) * 2.0);
    vec3 col = mix(color1, color2, smoothstep(0.1, 0.6, combined));
    col = mix(col, color3, smoothstep(0.4, 0.9, n2 * 0.5 + 0.5));
    col *= 0.85 + combined * 0.6;
    gl_FragColor = vec4(col, alpha);
  }
`;

export const blackHoleVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blackHoleFragmentShader = `
  uniform float time;
  uniform vec3 diskColor;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float dist = length(vPosition.xy);
    float angle = atan(vPosition.y, vPosition.x);
    float swirl = sin(angle * 6.0 + time * 1.5) * 0.5 + 0.5;
    float disk = smoothstep(0.95, 1.35, dist) * smoothstep(2.8, 1.6, dist);
    vec3 color = diskColor;
    color = mix(color, vec3(1.0, 0.6, 0.2), swirl * 0.7);
    color *= 1.0 + sin(time * 3.0) * 0.15;
    float alpha = disk * 0.95;
    float vertical = pow(1.0 - abs(vNormal.y), 2.0);
    alpha += vertical * 0.3 * smoothstep(1.0, 2.5, dist);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const atmosphereVertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = `
  uniform vec3 color;
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(color, intensity * 0.6);
  }
`;