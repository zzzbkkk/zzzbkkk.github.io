import { writeFile, mkdir } from 'node:fs/promises';
import { createRibbonRaster, rasterizeRibbon, ribbonFraming, ribbonGlyph, ribbonGray } from '../src/visuals/ribbon-shape.mjs';

const width = 1440, height = 1000, cellX = 7.5, cellY = 9.5;
const raster = createRibbonRaster(Math.ceil(width / cellX), Math.ceil(height / cellY));
rasterizeRibbon(raster, { width, height, cellX, cellY, elapsed: 0, framing: ribbonFraming(width, 'home') });
const groups = new Map();
let count = 0;
for (let index = 0; index < raster.light.length; index++) {
  const light = raster.light[index];
  if (!light) continue;
  const x = (index % raster.columns + 0.5) * cellX;
  const y = (Math.floor(index / raster.columns) + 0.5) * cellY;
  const shade = Math.min(248, Math.round(ribbonGray(light, raster.edge[index]) / 8) * 8);
  const key = `${y}:${shade}`;
  if (!groups.has(key)) groups.set(key, { y, shade, xs: [], chars: [] });
  const group = groups.get(key);
  group.xs.push(x); group.chars.push(ribbonGlyph(light, index, raster.edge[index]));
  count++;
}
const glyphs = Array.from(groups.values(), group => `<text x="${group.xs.join(' ')}" y="${group.y}" fill="rgb(${group.shade},${group.shade},${group.shade})">${group.chars.join('')}</text>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>ASCII folded ribbon</title><rect width="100%" height="100%" fill="#000"/><g font-family="Courier New,monospace" font-size="9" text-anchor="middle" dominant-baseline="middle">${glyphs.join('')}</g></svg>\n`;
await mkdir('public/art', { recursive: true });
await writeFile('public/art/ribbon-ascii.svg', svg);
console.log(`Generated ribbon-ascii.svg (${count} ASCII cells).`);
