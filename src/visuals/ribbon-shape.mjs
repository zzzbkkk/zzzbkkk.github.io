// One authored surface shared by the live ASCII renderer and its static poster.
// Units are independent of the viewport so scene handoffs never store pixels.
export const RIBBON_COMPOSITIONS = {
  home: { x: 0.29, y: 0.57, scale: 0.32 },
  portfolio: { x: 0.82, y: 0.58, scale: 0.43 },
  reading: { x: 0.86, y: 0.59, scale: 0.405 },
  blog: { x: 0.8, y: 0.59, scale: 0.42 },
};

const PI = Math.PI;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = v => { const length = Math.hypot(...v) || 1; return v.map(value => value / length); };

export function ribbonFraming(width, composition = 'home') {
  const frame = RIBBON_COMPOSITIONS[composition] || RIBBON_COMPOSITIONS.home;
  // A phone sees a broad fragment, rather than a miniaturised entire sculpture.
  return width < 768 ? { x: 1.02, y: 0.66, scale: 0.32 } : { ...frame };
}

function surface(u, v, time) {
  const theta = u * PI * 2.02 - PI * 0.63;
  const breath = Math.sin(time * 0.13) * 0.025;
  const cx = Math.sin(theta) * (0.76 + breath);
  const cy = (u - 0.5) * 2.68;
  const cz = Math.cos(theta) * 0.32;
  const tx = Math.cos(theta) * (0.76 + breath) * PI * 2.02;
  const ty = 2.68;
  const tangentLength = Math.hypot(tx, ty);
  const nx = -ty / tangentLength;
  const ny = tx / tangentLength;
  // Broad near-planar faces turn into a narrow edge at each fold. The changing
  // normal, not particles or a glowing outline, makes the paper-like volume.
  const roll = 0.24 + Math.sin(u * PI * 2.1 - 0.7) * 1.03
    + Math.tanh((u - 0.54) * 14) * 0.2 + Math.sin(time * 0.16 + u * 3) * 0.065;
  const halfWidth = 0.30 + Math.sin(u * PI) * 0.055;
  const fold = v * halfWidth;
  return [cx + nx * fold * Math.cos(roll), cy + ny * fold * Math.cos(roll), cz + fold * Math.sin(roll)];
}

function rotate(point, time) {
  const yaw = -0.16 + Math.sin(time * 0.085) * 0.085;
  const tilt = -0.24 + Math.sin(time * 0.1) * 0.035;
  const x = point[0] * Math.cos(yaw) + point[2] * Math.sin(yaw);
  const z = -point[0] * Math.sin(yaw) + point[2] * Math.cos(yaw);
  return [x * Math.cos(tilt) - point[1] * Math.sin(tilt), x * Math.sin(tilt) + point[1] * Math.cos(tilt), z];
}

export function createRibbonRaster(columns, rows) {
  return {
    columns, rows,
    depth: new Float32Array(columns * rows),
    light: new Float32Array(columns * rows),
    edge: new Uint8Array(columns * rows),
  };
}

export function rasterizeRibbon(raster, { width, height, cellX, cellY, elapsed = 0, framing }) {
  const { columns, rows, depth, light, edge } = raster;
  depth.fill(-Infinity); light.fill(0); edge.fill(0);
  const scale = Math.min(width * 0.52, height * framing.scale);
  const mobileScale = width < 768 ? Math.min(height * framing.scale, width * 0.75) : scale;
  const size = width < 768 ? mobileScale : scale;
  const project = p => {
    const perspective = 3.8 / (3.8 - p[2]);
    return [(width * framing.x + p[0] * size * perspective) / cellX,
      (height * framing.y + p[1] * size * perspective) / cellY, p[2]];
  };
  const along = 156;
  const across = 10;
  const vertices = [];
  for (let i = 0; i <= along; i++) {
    for (let j = 0; j <= across; j++) {
      const u = i / along;
      const v = j / across * 2 - 1;
      const point = rotate(surface(u, v, elapsed), elapsed);
      const a = rotate(surface(u + 0.0005, v, elapsed), elapsed);
      const b = rotate(surface(u, v + 0.0005, elapsed), elapsed);
      const normal = normalize(cross(a.map((n, k) => n - point[k]), b.map((n, k) => n - point[k])));
      // Both sides of this thin material receive a little ambient light; the
      // face toward the upper-left key light retains a broad readable plane.
      const diffuse = Math.abs(normal[0] * -0.28 + normal[1] * -0.52 + normal[2] * 0.81);
      const edgeLight = Math.pow(Math.abs(v), 14) * 0.14;
      const brightness = clamp(0.16 + diffuse * 0.7 + edgeLight, 0.14, 1);
      vertices.push({ p: project(point), light: brightness, v, u });
    }
  }
  function triangle(a, b, c) {
    const [ax, ay, az] = a.p, [bx, by, bz] = b.p, [cx, cy, cz] = c.p;
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 0.00001) return;
    const x0 = clamp(Math.floor(Math.min(ax, bx, cx)), 0, columns - 1);
    const x1 = clamp(Math.ceil(Math.max(ax, bx, cx)), 0, columns - 1);
    const y0 = clamp(Math.floor(Math.min(ay, by, cy)), 0, rows - 1);
    const y1 = clamp(Math.ceil(Math.max(ay, by, cy)), 0, rows - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5;
      const wa = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denominator;
      const wb = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denominator;
      const wc = 1 - wa - wb;
      if (wa < -0.0001 || wb < -0.0001 || wc < -0.0001) continue;
      const index = y * columns + x;
      const z = wa * az + wb * bz + wc * cz;
      if (z <= depth[index]) continue;
      depth[index] = z;
      light[index] = wa * a.light + wb * b.light + wc * c.light;
      const v = wa * a.v + wb * b.v + wc * c.v;
      const u = wa * a.u + wb * b.u + wc * c.u;
      edge[index] = Math.abs(v) > 0.94 || u < 0.006 || u > 0.994 ? 1 : 0;
    }
  }
  for (let i = 0; i < along; i++) for (let j = 0; j < across; j++) {
    const a = i * (across + 1) + j;
    const b = a + across + 1;
    triangle(vertices[a], vertices[b], vertices[a + 1]);
    triangle(vertices[b], vertices[b + 1], vertices[a + 1]);
  }
  return raster;
}

export function ribbonGlyph(light, index, edge = 0) {
  const ramp = '.:;-=+*#';
  const grain = ((index * 17 + Math.floor(index / 13) * 7) % 11) / 11;
  const level = clamp(Math.floor(light * 5.1 + grain * 1.3), 0, 7);
  return edge ? (index % 3 ? '+' : '/') : ramp[level];
}

export function ribbonGray(light, edge = 0) {
  return Math.round(clamp(40 + light * 116 + edge * 24, 48, 178));
}
