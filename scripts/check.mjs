import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profile, works, posts } from '../src/data/content.mjs';

// A dependency-free check of the generated site. Run after `npm run build`.
// This validates literal resource references, not network availability or layout.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const origin = 'https://portfolio.local';
const languages = ['zh', 'en'];
const errors = [];
const checked = new Map();
const assets = new Set();
let referenceCount = 0;
const fail = message => errors.push(message);
const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
  if (named[entity]) return named[entity];
  const numeric = entity.slice(2, -1);
  const code = numeric[0]?.toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
});
function attributes(tag) {
  const result = {};
  const expression = /([^\s=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of tag.matchAll(expression)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4] ?? '');
  return result;
}
function tags(html, name = '[a-z][\\w:-]*') {
  // Generated templates quote their attributes; skip script/style bodies so
  // strings inside inline code are never mistaken for real document links.
  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, match => match.slice(0, match.indexOf('>') + 1));
  return [...markup.matchAll(new RegExp(`<(${name})\\b([^>]*?)>`, 'gi'))]
    .map(match => ({ name: match[1].toLowerCase(), attrs: attributes(match[2]) }));
}
async function fileFor(url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { throw new Error('invalid URL encoding'); }
  const target = path.resolve(dist, `.${pathname}`);
  const relative = path.relative(dist, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path escapes dist');
  const info = await stat(target).catch(() => null);
  if (info?.isDirectory()) {
    const index = path.join(target, 'index.html');
    if ((await stat(index).catch(() => null))?.isFile()) return index;
  } else if (info?.isFile()) return target;
  throw new Error('file does not exist');
}
async function contentAt(route) {
  if (!checked.has(route)) {
    checked.set(route, (async () => {
      const filename = await fileFor(new URL(route, origin));
      return { filename, content: await readFile(filename, 'utf8') };
    })());
  }
  return checked.get(route);
}
function checkSocial(url, attrs, page) {
  const host = url.hostname.replace(/^www\./, '');
  const platform = host === 'github.com' ? 'github' : host === 'woshipm.com' ? 'woshipm' : null;
  if (platform && ['/', ''].includes(url.pathname)) fail(`${page}: platform homepage used instead of a personal profile: ${url.href}`);
  if (attrs.class?.split(/\s+/).includes('social-link')) {
    const allowed = [profile.github, profile.woshipm].filter(Boolean);
    if (!allowed.some(value => new URL(value).href === url.href)) fail(`${page}: social URL is not supplied in profile data: ${url.href}`);
  }
}
async function checkReference(value, from, kind, attrs = {}) {
  referenceCount++;
  const reference = value.trim();
  if (!reference || reference === '#') { fail(`${from}: empty or placeholder ${kind}`); return; }
  let url;
  try { url = new URL(reference, new URL(from, origin)); }
  catch { fail(`${from}: malformed ${kind}: ${reference}`); return; }
  if (['mailto:', 'tel:', 'data:', 'blob:'].includes(url.protocol)) return;
  if (!['http:', 'https:'].includes(url.protocol)) { fail(`${from}: unsupported ${kind}: ${reference}`); return; }
  if (url.origin !== origin) { if (kind === 'href') checkSocial(url, attrs, from); return; }
  let target;
  try { target = await fileFor(url); }
  catch (error) { fail(`${from}: broken ${kind} ${reference} (${error.message})`); return; }
  const extension = path.extname(target).toLowerCase();
  if (url.hash && extension === '.html') {
    const targetHtml = await readFile(target, 'utf8');
    const id = decodeURIComponent(url.hash.slice(1));
    const exists = tags(targetHtml).some(tag => tag.attrs.id === id || (tag.name === 'a' && tag.attrs.name === id));
    if (!exists) fail(`${from}: missing fragment ${reference}`);
  }
  if (['.css', '.js', '.mjs'].includes(extension)) await checkAsset(url.pathname, target, extension);
}
function stripComments(source) {
  // Preserve quoted strings (including URL slashes) while removing JS comments.
  return source.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, (match, quoted) => quoted ?? ' ');
}
async function checkModule(source, from) {
  const code = stripComments(source);
  const imports = [];
  const staticImports = /\b(?:import|export)\s+(?:[\w*$ {},\s]+?\s+from\s*)?(['"])([^'"\r\n]+)\1/g;
  const dynamicImports = /\bimport\s*\(\s*(['"`])([^'"`]+)\1\s*(?:,|\))/g;
  for (const expression of [staticImports, dynamicImports]) {
    for (const match of code.matchAll(expression)) imports.push(match[2]);
  }
  for (const specifier of new Set(imports)) {
    if (!specifier.startsWith('.') && !specifier.startsWith('/') && !/^https?:/.test(specifier)) {
      fail(`${from}: bare module import requires an import map: ${specifier}`);
    } else if (specifier.includes('${')) {
      fail(`${from}: computed module import cannot be checked statically: ${specifier}`);
    } else await checkReference(specifier, from, 'module import');
  }
}
async function checkCss(source, from) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi)) {
    await checkReference(match[1] ?? match[2] ?? match[3], from, 'CSS url');
  }
  for (const match of css.matchAll(/@import\s+(['"])([^'"]+)\1/gi)) await checkReference(match[2], from, 'CSS import');
}
async function checkAsset(urlPath, filename, extension) {
  if (assets.has(filename)) return;
  assets.add(filename);
  const content = await readFile(filename, 'utf8');
  if (extension === '.css') await checkCss(content, urlPath);
  else await checkModule(content, urlPath);
}
async function checkPage(route) {
  let html;
  try { html = (await contentAt(route)).content; }
  catch (error) { fail(`${route}: page missing (${error.message}); run npm run build first`); return; }
  const lang = route.split('/')[1];
  const elements = tags(html);
  const htmlLanguage = elements.find(tag => tag.name === 'html')?.attrs.lang;
  if (!(lang === 'zh' ? /^zh(?:-|$)/ : /^en(?:-|$)/).test(htmlLanguage || '')) fail(`${route}: incorrect html lang: ${htmlLanguage}`);
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/gi)];
  if (h1.length !== 1 || !h1[0][1].replace(/<[^>]*>/g, '').trim()) fail(`${route}: expected one nonempty H1, found ${h1.length}`);
  const titles = [...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/gi)];
  if (titles.length !== 1 || !titles[0][1].trim()) fail(`${route}: missing or duplicate page title`);
  const descriptions = elements.filter(tag => tag.name === 'meta' && tag.attrs.name?.toLowerCase() === 'description');
  if (descriptions.length !== 1 || !descriptions[0].attrs.content?.trim()) fail(`${route}: missing or duplicate meta description`);
  const switcher = elements.filter(tag => tag.name === 'a' && Object.hasOwn(tag.attrs, 'data-language'));
  const other = lang === 'zh' ? 'en' : 'zh';
  const alternate = route.replace(`/${lang}/`, `/${other}/`);
  if (switcher.length !== 1 || new URL(switcher[0].attrs.href || '', origin).pathname !== alternate) fail(`${route}: language link does not preserve the current route`);
  for (const element of elements) {
    for (const attribute of ['href', 'src']) {
      if (Object.hasOwn(element.attrs, attribute)) await checkReference(element.attrs[attribute], route, attribute, element.attrs);
    }
    if (element.attrs.style) await checkCss(element.attrs.style, route);
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) await checkCss(match[1], route);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) if (match[1].trim()) await checkModule(match[1], route);
  if (route === `/${lang}/` || route === `/${lang}/portfolio/`) {
    const cards = elements.filter(tag => tag.name === 'article' && Object.hasOwn(tag.attrs, 'data-work'));
    if (cards.length !== works.length) fail(`${route}: expected ${works.length} work cards, found ${cards.length}`);
    for (const work of works) {
      const matching = cards.filter(card => card.attrs['data-work'] === work.slug);
      if (matching.length !== 1 || matching[0].attrs['data-category'] !== work.category) fail(`${route}: incorrect card/category for ${work.slug}`);
    }
  }
}

const expectedCategories = { 'openclaw-operations': 'project', 'yesoul-t5': 'project', oiioii: 'analysis', drimo: 'analysis' };
if (works.length !== 4 || new Set(works.map(work => work.slug)).size !== 4) fail('Content: expected four distinct supplied works');
for (const [slug, category] of Object.entries(expectedCategories)) {
  if (works.find(work => work.slug === slug)?.category !== category) fail(`Content: ${slug} must have category ${category}`);
}
for (const work of works) {
  for (const lang of languages) {
    for (const field of ['title', 'summary', 'type']) if (!work[field]?.[lang]?.trim()) fail(`Content: ${work.slug}.${field}.${lang} is empty`);
    if (!Array.isArray(work.tags?.[lang]) || !Array.isArray(work.sections?.[lang])) fail(`Content: ${work.slug} has incomplete ${lang} fields`);
  }
}
if (posts.length) fail('Content: first-release blog must remain empty until real articles and routes are added');
const expectedRoutes = languages.flatMap(lang => [
  `/${lang}/`, ...['portfolio', 'blog', 'about'].map(page => `/${lang}/${page}/`),
  ...works.map(work => `/${lang}/portfolio/${work.slug}/`),
]);
try {
  const manifest = JSON.parse(await readFile(path.join(root, 'build-manifest.json'), 'utf8'));
  if (manifest.pages?.length !== expectedRoutes.length || new Set(manifest.pages).size !== expectedRoutes.length || expectedRoutes.some(route => !manifest.pages.includes(route))) fail(`Build manifest: expected ${expectedRoutes.length} bilingual content routes`);
  if (manifest.works !== works.length || JSON.stringify(manifest.languages) !== JSON.stringify(languages)) fail('Build manifest: content or language counts do not match data');
} catch (error) { fail(`Build manifest unavailable: ${error.message}; run npm run build first`); }
for (const route of expectedRoutes) await checkPage(route);

if (errors.length) {
  console.error(`Static check failed (${errors.length}):\n${errors.map(message => `- ${message}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Static check passed: ${expectedRoutes.length} bilingual pages, ${works.length} correctly classified works, ${referenceCount} links/resource references, ${assets.size} CSS/JS modules.`);
  console.log('Verified page metadata, H1s, alternate routes, local fragments/assets, literal module imports, and configured social links. No network or browser checks performed.');
}
