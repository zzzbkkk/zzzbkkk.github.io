// Optional offline authoring step. The website does not import this file or Draco.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '../../public/art');
const source = process.argv[2] || 'C:/Users/Z/Documents/Codex/2026-09-23/new-chat/outputs/dragonfly-redux/public';
const dracoPath = path.join(source, '@gl/libs/draco');
const decoderSource = await fs.readFile(path.join(dracoPath, 'draco_wasm_wrapper.js'), 'utf8');
const container = { exports: {} };
new Function('module', 'exports', 'require', '__dirname', decoderSource)(container, container.exports, createRequire(import.meta.url), dracoPath);
const draco = await container.exports({ wasmBinary: await fs.readFile(path.join(dracoPath, 'draco_decoder.wasm')) });
const model = await fs.readFile(path.join(source, '@gl/models/dragonfly.glb'));
const jsonLength = model.readUInt32LE(12);
const scene = JSON.parse(model.subarray(20, 20 + jsonLength).toString());
const bin = model.subarray(28 + jsonLength);
// The animated asset stores bone offsets in its animation, not in the rest pose.
// Apply the first authored frame before baking geometry so the body is complete.
for (const animation of scene.animations || []) for (const channel of animation.channels) {
  const sampler = animation.samplers[channel.sampler];
  const accessor = scene.accessors[sampler.output];
  const bufferView = scene.bufferViews[accessor.bufferView];
  const dimensions = { VEC3: 3, VEC4: 4 }[accessor.type];
  if (!dimensions || accessor.componentType !== 5126) continue;
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  scene.nodes[channel.target.node][channel.target.path] = Array.from({ length: dimensions }, (_, i) => bin.readFloatLE(offset + i * 4));
}
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const multiply = (a, b) => Array.from({ length: 16 }, (_, i) => {
  const r = i % 4, c = Math.floor(i / 4);
  return a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
});
function matrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation || [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale || [1, 1, 1];
  const [tx, ty, tz] = node.translation || [0, 0, 0];
  return [(1 - 2 * y * y - 2 * z * z) * sx, (2 * x * y + 2 * z * w) * sx, (2 * x * z - 2 * y * w) * sx, 0,
    (2 * x * y - 2 * z * w) * sy, (1 - 2 * x * x - 2 * z * z) * sy, (2 * y * z + 2 * x * w) * sy, 0,
    (2 * x * z + 2 * y * w) * sz, (2 * y * z - 2 * x * w) * sz, (1 - 2 * x * x - 2 * y * y) * sz, 0, tx, ty, tz, 1];
}
const transform = (p, m) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
const sub = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = a => Math.hypot(...a);
const normalize = a => a.map(v => v / length(a));
const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
const eye = scene.nodes.find(n => n.name === 'camera-follow').translation;
const target = scene.nodes.find(n => n.name === 'camera-lookAt').translation;
const forward = normalize(sub(target, eye));
const right = normalize(cross(forward, [0, 1, 0]));
const up = normalize(cross(right, forward));
const view = p => { const v = sub(p, target); return [dot(v, right), dot(v, up), -dot(v, forward)]; };
const triangles = [];
let meshes = 0;
function visit(index, parent) {
  const node = scene.nodes[index];
  const world = multiply(parent, matrix(node));
  if (node.mesh !== undefined) {
    meshes++;
    for (const primitive of scene.meshes[node.mesh].primitives) {
      const extension = primitive.extensions.KHR_draco_mesh_compression;
      const bufferView = scene.bufferViews[extension.bufferView];
      const encoded = bin.subarray(bufferView.byteOffset || 0, (bufferView.byteOffset || 0) + bufferView.byteLength);
      const decoder = new draco.Decoder();
      const buffer = new draco.DecoderBuffer();
      buffer.Init(encoded, encoded.length);
      const mesh = new draco.Mesh();
      const status = decoder.DecodeBufferToMesh(buffer, mesh);
      if (!status.ok()) throw new Error(status.error_msg());
      const attribute = decoder.GetAttributeByUniqueId(mesh, extension.attributes.POSITION);
      const values = new draco.DracoFloat32Array();
      decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
      const vertices = Array.from({ length: mesh.num_points() }, (_, i) => view(transform([values.GetValue(i * 3), values.GetValue(i * 3 + 1), values.GetValue(i * 3 + 2)], world)));
      const face = new draco.DracoInt32Array();
      for (let i = 0; i < mesh.num_faces(); i++) {
        decoder.GetFaceFromMesh(mesh, i, face);
        const points = [0, 1, 2].map(j => vertices[face.GetValue(j)]);
        const normal = cross(sub(points[1], points[0]), sub(points[2], points[0]));
        const area = length(normal) / 2;
        if (area > 1e-12) triangles.push({ points, area, light: 0.25 + 0.75 * Math.abs(dot(normalize(normal), normalize([-0.2, 0.7, 1]))) });
      }
      for (const object of [face, values, mesh, buffer, decoder]) draco.destroy(object);
    }
  }
  for (const child of node.children || []) visit(child, world);
}
// Only the insect: no branch, logo, text, badges or interface elements.
visit(scene.nodes.findIndex(n => n.name === 'Dfly'), identity);
const bounds = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
for (const triangle of triangles) for (const point of triangle.points) for (let i = 0; i < 3; i++) {
  bounds[i][0] = Math.min(bounds[i][0], point[i]);
  bounds[i][1] = Math.max(bounds[i][1], point[i]);
}
const center = bounds.map(([a, b]) => (a + b) / 2);
const scale = Math.max(bounds[0][1] - bounds[0][0], (bounds[1][1] - bounds[1][0]) * 1.55) / 1.88;
let seed = 129;
const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
const points = [];
const area = triangles.reduce((n, t) => n + t.area, 0);
for (const triangle of triangles) {
  const expected = triangle.area / area * 32000;
  const count = Math.floor(expected) + (random() < expected % 1 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    const u = Math.sqrt(random()), v = random();
    const p = [0, 1, 2].map(axis => ((1 - u) * triangle.points[0][axis] + u * (1 - v) * triangle.points[1][axis] + u * v * triangle.points[2][axis] - center[axis]) / scale);
    points.push([...p, triangle.light]);
  }
}
const cols = 192, rows = 100;
const grid = new Uint8Array(cols * rows);
const depth = new Float32Array(cols * rows).fill(-Infinity);
for (const [x, y, z, shade] of points) {
  const col = Math.round((x + 1) * (cols - 1) / 2);
  const row = Math.round((0.56 - y) / 1.12 * (rows - 1));
  if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
  const i = row * cols + col;
  if (z > depth[i]) { depth[i] = z; grid[i] = Math.round(32 + shade * 135); }
}
// A visible-surface point for each ASCII cell retains depth with a tiny payload.
const visible = [];
for (let i = 0; i < grid.length; i++) if (grid[i]) visible.push([(i % cols) / (cols - 1) * 2 - 1, 0.56 - Math.floor(i / cols) / (rows - 1) * 1.12, depth[i], grid[i]]);
const cloud = Buffer.alloc(visible.length * 7);
visible.forEach((p, i) => { for (let j = 0; j < 3; j++) cloud.writeInt16LE(Math.round(Math.max(-1.99, Math.min(1.99, p[j])) * 16000), i * 7 + j * 2); cloud[i * 7 + 6] = p[3]; });
const data = { columns: cols, rows, width: 1536, height: 896, pointCount: visible.length, grid: Buffer.from(grid).toString('base64'), points: cloud.toString('base64') };
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(here, 'dragonfly-data.js'), `// Generated from the insect geometry only; no runtime model/Draco dependency.\nexport default ${JSON.stringify(data)};\n`);
const ramp = ' .,:;+=xX#@';
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="896" viewBox="0 0 1536 896" role="img" aria-label="Decorative ASCII dragonfly"><rect width="100%" height="100%" fill="#000000"/><g font-family="monospace" font-size="10" text-anchor="middle">';
for (let shade = 0; shade < 8; shade++) for (let accent = 0; accent < 2; accent++) {
  svg += `<g fill="${accent ? '#FA4C14' : '#F2F2F2'}" fill-opacity="${(0.11 + shade * 0.035).toFixed(3)}">`;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const value = grid[y * cols + x];
    const orange = value > 90 && (x * 13 + y * 7) % 67 === 0 ? 1 : 0;
    if (value && orange === accent && Math.min(7, Math.floor(value / 24)) === shade) svg += `<text x="${x * 8 + 4}" y="${(y * 8.96 + 8).toFixed(2)}">${escape(ramp[Math.min(ramp.length - 1, Math.max(1, Math.floor(value / 20)))])}</text>`;
  }
  svg += '</g>';
}
svg += '</g></svg>';
await fs.writeFile(path.join(output, 'dragonfly-ascii.svg'), svg);
console.log(JSON.stringify({ meshes, triangles: triangles.length, points: points.length, cells: grid.filter(v => v > 0).length, bounds, svgBytes: Buffer.byteLength(svg) }));
