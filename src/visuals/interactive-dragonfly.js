import {
  V as Vector2, i as Vector3, C as Color, ac as Scene, X as PerspectiveCamera,
  Z as OrthographicCamera, an as WebGLRenderer, ag as ShaderMaterial,
  ae as WebGLRenderTarget, af as HalfFloatType, ad as PlaneGeometry,
  G as Mesh, W as Group, aj as AnimationMixer, ah as CanvasTexture,
  r as NearestFilter, R as RepeatWrapping, y as DoubleSide, ai as NormalBlending,
} from '/vendor/three.js';
import { GLTFLoader, DRACOLoader } from '/vendor/dragonfly-loaders.js';
import { modelVertex, modelFragment, asciiVertex, asciiFragment, trailVertex, trailFragment } from './dragonfly-shaders.js';

const TRAIL_LENGTH = 40;
const FRAME_INTERVAL = 1000 / 30;
const TRAIL_EPSILON = 0.0001;
const LIGHT_PERIOD = 22;
const lerp = (from, to, progress) => from + (to - from) * progress;
const COMPOSITIONS = {
  intro: { x: 0, zoom: 1 },
  home: { x: -0.2, zoom: 1.12 },
  portfolio: { x: 0.1, zoom: 1.04 },
  reading: { x: 0.22, zoom: 1.08 },
  blog: { x: 0.12, zoom: 1.16 },
};
const finiteInRange = (value, minimum, maximum, fallback) => (
  typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : fallback
);

// Keep the vendored shader intact. This local material variation separates the
// wing facets with contrast and a small, view-dependent edge light; it adds no
// bloom, extra render pass or color to the grayscale ASCII output.
const refinedModelFragment = modelFragment
  .replace('uniform float uReveal;', `uniform float uRimStrength;
uniform float uIntroProgress;
uniform float uIntroWing;
uniform float uIntroWingDelay;
uniform float uReveal;`)
  .replace('color *= uRemapColor;', `
    color = clamp((color - 0.5) * 1.1 + 0.5, 0.1, 0.995);
    vec3 viewDirection = normalize(-vPosition);
    float rim = pow(1.0 - abs(dot(normal, viewDirection)), 3.2);
    color += vec3(rim * uRimStrength * (0.3 + diff * 0.7));
    color = min(color, vec3(0.995)) * uRemapColor;
  `)
  .replace('gl_FragColor = vec4(color, visible);', `
    // Only the four authored wing meshes appear in the first 450ms. Body and
    // branch return together afterwards; at 1350ms this is the original color.
    float formation = smoothstep(0.3, 0.9, uIntroProgress);
    float wingPresence = smoothstep(uIntroWingDelay, uIntroWingDelay + 0.1, uIntroProgress + 0.06);
    color *= mix(formation, max(formation, wingPresence), uIntroWing);
    gl_FragColor = vec4(color, visible);
  `);

// Reuse the existing silhouette detection to expose actual geometric edges,
// rather than lighting the broad faces of the wings during the first phase.
// At 1350ms the multiplier is exactly one; the normal ASCII/trail pass is intact.
const introAsciiFragment = asciiFragment
  .replace('uniform float uOpacity;', 'uniform float uIntroProgress;\nuniform float uOpacity;')
  .replace('finalColor += vec3(uBrightness);', `
    finalColor += vec3(uBrightness);
    float introFormation = smoothstep(0.3, 0.9, uIntroProgress);
    float introContour = smoothstep(0.015, 0.28, edgeMask);
    finalColor *= mix(introContour, 1.0, introFormation);
  `);

/**
 * The reference's live model, wing animation and ASCII/trail passes, isolated
 * from Nuxt, GSAP, tracking, menus and scroll-triggered scene changes.
 * The caller keeps a static image visible until onReady and owns intro timing.
 */
export async function mountInteractiveDragonfly(canvas, { onReady, signal, composition = 'home', initialState, introStartedAt = null } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required.');
  if (signal?.aborted) throw signal.reason || new DOMException('Dragonfly loading was aborted.', 'AbortError');
  composition = Object.hasOwn(COMPOSITIONS, composition) ? composition : 'home';
  // Navigation may hand us a sessionStorage payload. Invalid or older snapshots
  // are harmless; viewport-dependent values are never restored as pixel offsets.
  const restored = initialState && typeof initialState === 'object' && initialState.version === 1 ? initialState : {};
  let framingTarget = COMPOSITIONS[composition];
  const framing = {
    x: composition === 'intro' ? 0 : finiteInRange(restored.framing?.x, -0.3, 0.3, framingTarget.x),
    zoom: composition === 'intro' ? 1 : finiteInRange(restored.framing?.zoom, 1, 1.25, framingTarget.zoom),
  };
  const loadController = new AbortController();
  let renderer, draco, gltf, mixer, animation;
  let disposed = false, manualPaused = false, focused = true, contextLost = false, ready = false, raf = 0, resizeRaf = 0;
  let observer, resizeHandler, documentVisibilityHandler, focusHandler, blurHandler, pointerHandler, contextLostHandler, externalAbortHandler;
  let running = false, frames = 0, elapsed = 0, wingPhase = 0, lastTime = 0, previousFrameTime = 0;
  let width = 1, height = 1, left = 0, top = 0, modelCalls = 0, modelTriangles = 0;
  let trailDrawing = false, trailIsClear = false, trailDraws = 0, trailClears = 0, lastTrailDraw = false, resizeCount = 0;
  const rasterSize = { width: 0, height: 0, dpr: 0 };
  const created = performance.now();
  const introOrigin = typeof introStartedAt === 'number' && Number.isFinite(introStartedAt) ? introStartedAt : null;
  let introProgress = composition === 'intro' ? 0 : 1;
  const introUniform = { value: introProgress };
  const introPhase = progress => progress < 0.3 ? 'wing-edges' : progress < 0.9 ? 'body-reveal' : 'complete';
  const resources = new Set();
  const geometries = new Set();
  const pointer = new Vector2(0, 0);
  const target = new Vector2(0, 0);
  const previousPointer = new Vector2(0, 0);
  let velocity = 0, pointerSeen = false, pointerMoves = 0;
  let finePointerSeen = false, lastFinePointerTime = -20;
  const trail = Array.from({ length: TRAIL_LENGTH }, () => new Vector2(0.5, 0.5));
  const strength = new Float32Array(TRAIL_LENGTH);
  const scene = new Scene();
  const modelGroup = new Group();
  scene.add(modelGroup);
  const camera = new PerspectiveCamera(11, 1, 0.1, 1000);
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const asciiScene = new Scene();
  const trailScene = new Scene();
  let cameraFollow, cameraLookAt, wings, insectMaterial, branchMaterial, asciiMaterial, trailMaterial, modelTarget, trailTarget, charactersTexture;

  elapsed = finiteInRange(restored.elapsed, 0, 604800, 0);
  wingPhase = finiteInRange(restored.wingPhase, 0, Math.PI * 40, 0);
  pointer.set(finiteInRange(restored.pointer?.x, -1, 1, 0), finiteInRange(restored.pointer?.y, -1, 1, 0));
  target.set(finiteInRange(restored.pointer?.targetX, -1, 1, pointer.x), finiteInRange(restored.pointer?.targetY, -1, 1, pointer.y));
  previousPointer.set(finiteInRange(restored.pointer?.previousX, -1, 1, pointer.x), finiteInRange(restored.pointer?.previousY, -1, 1, pointer.y));
  velocity = finiteInRange(restored.pointer?.velocity, 0, 3000, 0);
  pointerSeen = restored.pointer?.seen === true;
  finePointerSeen = restored.parallax?.finePointer === true;
  lastFinePointerTime = elapsed - finiteInRange(restored.parallax?.idleSeconds, 0, 20, 20);
  modelGroup.rotation.x = finiteInRange(restored.rotation?.x, -0.01, 0.01, 0);
  modelGroup.rotation.y = finiteInRange(restored.rotation?.y, -0.01, 0.01, 0);
  const restoredTrail = Array.isArray(restored.trail) && restored.trail.length === TRAIL_LENGTH ? restored.trail : [];
  for (let index = 0; index < TRAIL_LENGTH; index++) {
    const point = restoredTrail[index];
    trail[index].set(finiteInRange(point?.x, 0, 1, (pointer.x + 1) / 2), finiteInRange(point?.y, 0, 1, (pointer.y + 1) / 2));
    strength[index] = finiteInRange(point?.strength, 0, 1, 0);
  }

  function applyFraming() {
    const mobile = width <= 800;
    // Offset only the model camera. The ASCII and pointer passes still cover
    // the actual canvas, so the orange trail remains directly under the cursor.
    const offset = framing.x * (mobile ? 0.27 : 1);
    camera.fov = (mobile ? 17 : 11) * (1 + (framing.zoom - 1) * (mobile ? 0.65 : 1));
    camera.aspect = width / height;
    if (Math.abs(offset) > 0.00001) camera.setViewOffset(width, height, -width * offset, 0, width, height);
    else { camera.clearViewOffset(); camera.updateProjectionMatrix(); }
  }

  // Keep the cover centered for its whole duration, then reuse the same model
  // and wing phase while easing toward the page's reading composition.
  function setComposition(next, immediate = false) {
    if (disposed || !Object.hasOwn(COMPOSITIONS, next)) return;
    composition = next;
    framingTarget = COMPOSITIONS[next];
    if (immediate) {
      Object.assign(framing, framingTarget);
      applyFraming();
      if (ready && !contextLost) draw();
    }
  }

  // Progress is owned by the cover's real clock, never replayed by asset load.
  // Normal pages leave it at one. Hidden/paused scenes only update the uniform.
  function setIntroProgress(progress) {
    if (disposed || contextLost || typeof progress !== 'number' || !Number.isFinite(progress)) return false;
    const previousPhase = introPhase(introProgress);
    introProgress = Math.max(0, Math.min(1, progress));
    introUniform.value = introProgress;
    if (ready && previousPhase !== introPhase(introProgress) && !manualPaused && !document.hidden && focused) draw();
    return true;
  }

  const abortReason = () => loadController.signal.reason || new DOMException('Dragonfly loading was aborted.', 'AbortError');
  function cancellable(promise) {
    return new Promise((resolve, reject) => {
      const onAbort = () => reject(abortReason());
      // Always consume the parsing result, including when abort wins before
      // this wrapper attaches; its late rejection must never go unhandled.
      promise.then(
        value => { loadController.signal.removeEventListener('abort', onAbort); resolve(value); },
        error => { loadController.signal.removeEventListener('abort', onAbort); reject(error); },
      );
      if (loadController.signal.aborted) onAbort();
      else loadController.signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  // Decoder completion can race an abort. Dispose geometry that arrives after
  // the mount has been cancelled, even though it was never attached to a scene.
  function discardLateModel(model) {
    const released = new Set();
    const release = resource => {
      if (resource?.dispose && !released.has(resource)) { released.add(resource); resource.dispose(); }
    };
    model?.scene?.traverse(object => {
      release(object.geometry); release(object.skeleton);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        for (const value of Object.values(material)) if (value?.isTexture) release(value);
        release(material);
      }
    });
    model?.scene?.clear();
  }

  function track(resource) { resources.add(resource); return resource; }
  function makeModelMaterial(isBranch) {
    return track(new ShaderMaterial({
      uniforms: {
        // Suppress the supporting branch while keeping the insect silhouette
        // distinct. ASCII output remains neutral; the orange pointer is separate.
        uRemapColor: { value: isBranch ? new Vector3(0.22, 0.22, 0.22) : new Vector3(0.92, 0.92, 0.92) },
        uLightDir: { value: isBranch ? new Vector3(0, 0.8, 1) : new Vector3(0, 2, 1) },
        uBrightness: { value: isBranch ? 0.3 : 0.23 },
        uNormalStrength: { value: isBranch ? 1.5 : 0.56 },
        uRimStrength: { value: isBranch ? 0 : 0.075 },
        uIntroProgress: introUniform,
        uIntroWing: { value: 0 },
        uIntroWingDelay: { value: 0 },
        uFlatShading: { value: 0 }, uReveal: { value: 0 },
      },
      vertexShader: modelVertex, fragmentShader: refinedModelFragment,
      side: DoubleSide, transparent: true,
    }));
  }

  function makeCharacters() {
    const atlas = document.createElement('canvas');
    atlas.width = atlas.height = 1024;
    const context = atlas.getContext('2d');
    if (!context) throw new Error('ASCII texture canvas is unavailable.');
    const texture = track(new CanvasTexture(atlas));
    texture.minFilter = texture.magFilter = NearestFilter;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    const draw = () => {
      if (disposed) return;
      context.clearRect(0, 0, 1024, 1024);
      context.font = '72px "NaturalMono", monospace';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      context.fillStyle = '#ffffff';
      // Only the zero-luminance cell is empty. The reference atlas had blank
      // midtones (7/8), which erased broad flat parts of the thorax and wings.
      ' *._<>,::./O#SF+'.split('').forEach((character, index) => {
        context.fillText(character, (index % 16) * 64 + 32, Math.floor(index / 16) * 64 + 32);
      });
      texture.needsUpdate = true;
    };
    draw();
    // A late font may improve the atlas; it never delays the first render.
    document.fonts?.load('72px "NaturalMono"').then(draw).catch(() => {});
    return texture;
  }

  function resize() {
    if (disposed || contextLost) return false;
    const bounds = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds.width || window.innerWidth));
    const nextHeight = Math.max(1, Math.round(bounds.height || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    left = bounds.left; top = bounds.top;
    if (rasterSize.width === nextWidth && rasterSize.height === nextHeight && rasterSize.dpr === dpr) return false;
    const dimensionsChanged = rasterSize.width !== nextWidth || rasterSize.height !== nextHeight;
    width = nextWidth; height = nextHeight;
    Object.assign(rasterSize, { width, height, dpr });
    // setPixelRatio calls setSize internally. This public API changes the three
    // raster dimensions together, so the canvas is reset only once per resize.
    renderer.setDrawingBufferSize(width, height, dpr);
    applyFraming();
    modelTarget.setSize(width, height);
    trailTarget.setSize(Math.max(1, Math.round(width / 4)), Math.max(1, Math.round(height / 4)));
    if (dimensionsChanged) trailIsClear = false;
    asciiMaterial.uniforms.uResolution.value.set(width, height);
    resizeCount++;
    return true;
  }

  function scheduleResize() {
    if (disposed || contextLost || resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      const changed = resize();
      // A manually paused background retains its current pose after a resize.
      if (changed && ready && !running && !document.hidden && focused) draw();
    });
  }

  function update(dt) {
    const damping = 1 - Math.exp(-6 * dt);
    const follow = 1 - Math.pow(0.9, dt * 60);
    if (Math.abs(framing.x - framingTarget.x) > 0.00001 || Math.abs(framing.zoom - framingTarget.zoom) > 0.00001) {
      const framingFollow = 1 - Math.exp(-8 * dt);
      framing.x = lerp(framing.x, framingTarget.x, framingFollow);
      framing.zoom = lerp(framing.zoom, framingTarget.zoom, framingFollow);
      applyFraming();
    }
    velocity = lerp(velocity, pointer.distanceTo(previousPointer) / Math.max(dt, 0.001), follow);
    previousPointer.copy(pointer);
    pointer.lerp(target, damping);
    const trailDamping = 1 - Math.pow(1 - 0.499, dt * 60);
    for (let index = TRAIL_LENGTH - 1; index > 0; index--) {
      trail[index].lerp(trail[index - 1], trailDamping);
      strength[index] = lerp(strength[index], strength[index - 1] * 0.99, trailDamping);
    }
    trail[0].set((pointer.x + 1) / 2, (pointer.y + 1) / 2);
    strength[0] = pointerSeen ? Math.min(velocity * TRAIL_LENGTH, 1) : 0;
    trailMaterial.uniforms.uTime.value = elapsed;
    trailMaterial.uniforms.uVelocity.value = pointerSeen ? velocity : 0;
    trailDrawing = pointerSeen && (velocity > TRAIL_EPSILON || strength.some(value => value > TRAIL_EPSILON));
    if (!trailDrawing) strength.fill(0);

    // Original animateWings default parameters with takeoff progress fixed at 0.
    // The reference scrubs flight/camera keyframes on page scroll; this site
    // intentionally keeps the first authored pose and does not capture scrolling.
    wingPhase += dt * 10.25;
    const amplitude = 42 * Math.PI / 180;
    const front = Math.sin(wingPhase * 0.1) * amplitude * 0.3;
    const back = Math.sin(wingPhase * 0.05) * amplitude * 0.2;
    wings.backLeft.rotation.z = lerp(wings.backLeft.rotation.z, back, follow);
    wings.backRight.rotation.z = lerp(wings.backRight.rotation.z, -back, follow);
    wings.frontLeft.rotation.z = lerp(wings.frontLeft.rotation.z, front * 0.8, follow);
    wings.frontRight.rotation.z = lerp(wings.frontRight.rotation.z, -front * 0.8, follow);
    // Only a fine mouse influences the pose. Let it settle back to the authored
    // framing after the pointer rests, independently of the original trail.
    const idleSeconds = Math.max(0, elapsed - lastFinePointerTime);
    const parallaxWeight = finePointerSeen ? Math.exp(-Math.max(0, idleSeconds - 0.65) * 2.4) : 0;
    const parallaxFollow = 1 - Math.exp(-2.8 * dt);
    modelGroup.rotation.y = lerp(modelGroup.rotation.y, pointer.x * 0.004 * parallaxWeight, parallaxFollow);
    modelGroup.rotation.x = lerp(modelGroup.rotation.x, -pointer.y * 0.0024 * parallaxWeight, parallaxFollow);
    // A slow cosine has no abrupt yoyo turn. The light direction follows the
    // same tiny closed arc, while the camera and wing frequencies stay fixed.
    const lightPhase = (elapsed % LIGHT_PERIOD) / LIGHT_PERIOD * Math.PI * 2;
    const light = (1 - Math.cos(lightPhase)) * 0.5;
    branchMaterial.uniforms.uBrightness.value = lerp(0.3, 0.78, light);
    insectMaterial.uniforms.uBrightness.value = lerp(0.23, 0.39, light);
    insectMaterial.uniforms.uLightDir.value.set(Math.sin(lightPhase) * 0.14, 2 + light * 0.12, 1);
    branchMaterial.uniforms.uLightDir.value.set(Math.sin(lightPhase) * 0.05, 0.8, 1);
  }

  function draw() {
    camera.position.copy(cameraFollow.position);
    camera.lookAt(cameraLookAt.position);
    lastTrailDraw = trailDrawing;
    if (trailDrawing) {
      renderer.setRenderTarget(trailTarget);
      renderer.clear(true, true, true);
      renderer.render(trailScene, screenCamera);
      trailIsClear = false;
      trailDraws++;
    } else if (!trailIsClear) {
      // An idle pointer produces a fully black trail. Keep the cleared texture
      // rather than re-running the 40-sample shader on every wing frame.
      renderer.setRenderTarget(trailTarget);
      renderer.clear(true, true, true);
      trailIsClear = true;
      trailClears++;
    }
    renderer.setRenderTarget(modelTarget);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    modelCalls = renderer.info.render.calls;
    modelTriangles = renderer.info.render.triangles;
    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(asciiScene, screenCamera);
    frames++;
  }

  function tick(now) {
    if (!running || disposed) return;
    raf = requestAnimationFrame(tick);
    const delta = now - lastTime;
    if (delta < FRAME_INTERVAL) return;
    const dt = Math.min((now - previousFrameTime) / 1000, 0.1);
    previousFrameTime = now;
    lastTime = now - (delta % FRAME_INTERVAL);
    elapsed += dt;
    update(dt);
    draw();
  }

  function syncRunning() {
    const next = !disposed && !contextLost && !manualPaused && !document.hidden && focused;
    if (next === running) return;
    running = next;
    cancelAnimationFrame(raf);
    if (running) { lastTime = previousFrameTime = performance.now(); raf = requestAnimationFrame(tick); }
  }

  function pause() { manualPaused = true; syncRunning(); }
  function resume() { if (!disposed) { manualPaused = false; syncRunning(); } }

  function dispose() {
    if (disposed) return;
    disposed = true; running = false;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(resizeRaf);
    signal?.removeEventListener('abort', externalAbortHandler);
    loadController.abort();
    observer?.disconnect();
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('pointermove', pointerHandler);
    window.removeEventListener('focus', focusHandler);
    window.removeEventListener('blur', blurHandler);
    document.removeEventListener('visibilitychange', documentVisibilityHandler);
    canvas.removeEventListener('webglcontextlost', contextLostHandler);
    draco?.dispose();
    mixer?.stopAllAction();
    if (gltf?.scene) mixer?.uncacheRoot(gltf.scene);
    for (const resource of resources) resource.dispose();
    for (const geometry of geometries) geometry.dispose();
    modelGroup.clear(); scene.clear(); asciiScene.clear(); trailScene.clear();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    resources.clear(); geometries.clear();
    gltf = null; mixer = null; animation = null; wings = null; cameraFollow = null; cameraLookAt = null;
  }

  function getState() {
    const strengths = Array.from(strength);
    return {
      ready, disposed, running, paused: manualPaused, hidden: document.hidden, focused, contextLost,
      introProgress, introPhase: introPhase(introProgress),
      composition, framing: { ...framing, effectiveOffset: framing.x * (width <= 800 ? 0.27 : 1) },
      frames, elapsed: Number(elapsed.toFixed(3)), fpsLimit: 30,
      trailDraws, trailClears, resizeCount,
      pointer: { x: pointer.x, y: pointer.y, targetX: target.x, targetY: target.y, seen: pointerSeen, moves: pointerMoves },
      parallax: { finePointer: finePointerSeen, idleSeconds: Math.min(20, Math.max(0, elapsed - lastFinePointerTime)), rotationX: modelGroup.rotation.x, rotationY: modelGroup.rotation.y },
      lighting: {
        period: LIGHT_PERIOD,
        insectBrightness: insectMaterial?.uniforms.uBrightness.value ?? null,
        branchBrightness: branchMaterial?.uniforms.uBrightness.value ?? null,
        rimStrength: insectMaterial?.uniforms.uRimStrength.value ?? null,
      },
      trail: { samples: TRAIL_LENGTH, active: strengths.filter(value => value > 0.01).length, maximum: Math.max(...strengths), velocity },
      trailActive: strengths.filter(value => value > 0.01).length,
      wings: wings ? Object.fromEntries(Object.entries(wings).map(([name, mesh]) => [name, mesh.rotation.z])) : null,
      wingAngles: wings ? Object.fromEntries(Object.entries(wings).map(([name, mesh]) => [name, mesh.rotation.z])) : null,
      renderer: renderer ? { drawCalls: modelCalls + 1 + Number(lastTrailDraw), triangles: modelTriangles + 2 + Number(lastTrailDraw) * 2, ...renderer.info.memory, width, height, pixelRatio: renderer.getPixelRatio() } : null,
      source: 'original-model-refined-lighting',
    };
  }

  // Persist this before navigation/pagehide, then pass it into the next mount.
  // Animation timestamps are relative; time away never advances a paused scene.
  function exportState() {
    return {
      version: 1,
      elapsed: elapsed % 604800,
      wingPhase: wingPhase % (Math.PI * 40),
      framing: { ...framing },
      pointer: { x: pointer.x, y: pointer.y, targetX: target.x, targetY: target.y, previousX: previousPointer.x, previousY: previousPointer.y, velocity, seen: pointerSeen },
      parallax: { finePointer: finePointerSeen, idleSeconds: Math.min(20, Math.max(0, elapsed - lastFinePointerTime)) },
      rotation: { x: modelGroup.rotation.x, y: modelGroup.rotation.y },
      wings: wings ? Object.fromEntries(Object.entries(wings).map(([name, mesh]) => [name, mesh.rotation.z])) : null,
      trail: trail.map((point, index) => ({ x: point.x, y: point.y, strength: strength[index] })),
    };
  }

  function captureFrame() {
    if (!ready || disposed || contextLost) return null;
    try {
      // Read immediately after this synchronous draw; keep the render buffer
      // transient during normal animation to avoid its ongoing memory cost.
      draw();
      return canvas.toDataURL('image/webp', 0.7);
    } catch { return null; }
  }

  try {
    externalAbortHandler = () => { loadController.abort(signal.reason); dispose(); };
    signal?.addEventListener('abort', externalAbortHandler, { once: true });
    renderer = new WebGLRenderer({ canvas, alpha: false, antialias: false, stencil: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    contextLostHandler = () => { contextLost = true; syncRunning(); };
    canvas.addEventListener('webglcontextlost', contextLostHandler);
    renderer.setClearColor(0x000000, 1);
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      throw new Error(`Dragonfly shader failed: ${gl.getProgramInfoLog(program)} ${gl.getShaderInfoLog(vertexShader)} ${gl.getShaderInfoLog(fragmentShader)}`);
    };
    draco = new DRACOLoader();
    draco.setDecoderPath('/vendor/draco/').setWorkerLimit(2).setDecoderConfig({ type: 'wasm' });
    // The vendored loader otherwise fetches its decoder through FileLoader,
    // which has no per-load signal and may spawn workers after disposal.
    draco._loadLibrary = async (filename, responseType) => {
      const response = await fetch(`${draco.decoderPath}${filename}`, { signal: loadController.signal });
      if (!response.ok) throw new Error(`Dragonfly decoder request failed (${response.status}).`);
      return responseType === 'arraybuffer' ? response.arrayBuffer() : response.text();
    };
    const initializeDecoder = draco._initDecoder.bind(draco);
    draco._initDecoder = () => initializeDecoder().then(() => {
      if (disposed || loadController.signal.aborted) { draco.dispose(); throw abortReason(); }
    });
    const loader = new GLTFLoader().setDRACOLoader(draco);
    // fetch owns an AbortSignal; the original GLTFLoader.loadAsync does not.
    const response = await cancellable(fetch('/models/dragonfly.glb', { signal: loadController.signal }));
    if (!response.ok) throw new Error(`Dragonfly model request failed (${response.status}).`);
    const buffer = await cancellable(response.arrayBuffer());
    if (loadController.signal.aborted) throw abortReason();
    const parsing = loader.parseAsync(buffer, '/models/').then(model => {
      if (disposed || loadController.signal.aborted) { discardLateModel(model); throw abortReason(); }
      return model;
    });
    gltf = await cancellable(parsing);
    if (disposed || loadController.signal.aborted) {
      discardLateModel(gltf); gltf = null;
      throw abortReason();
    }
    if (contextLost) throw new Error('WebGL context was lost while loading the dragonfly model.');
    // Geometry is decoded once. Workers are no longer needed during animation.
    draco.dispose();
    insectMaterial = makeModelMaterial(false);
    branchMaterial = makeModelMaterial(true);
    const originalMaterials = new Set();
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) originalMaterials.add(material);
      object.material = insectMaterial;
    });
    const branch = gltf.scene.getObjectByName('Branch002') || gltf.scene.getObjectByName('Branch.002');
    branch?.traverse(object => { if (object.isMesh) object.material = branchMaterial; });
    for (const material of originalMaterials) material.dispose();
    cameraFollow = gltf.scene.getObjectByName('camera-follow');
    cameraLookAt = gltf.scene.getObjectByName('camera-lookAt');
    wings = {
      backLeft: gltf.scene.getObjectByName('BackWing-L'), backRight: gltf.scene.getObjectByName('BackWing-R'),
      frontLeft: gltf.scene.getObjectByName('FrontWing-L'), frontRight: gltf.scene.getObjectByName('FrontWing-R'),
    };
    if (!cameraFollow || !cameraLookAt || Object.values(wings).some(wing => !wing) || !gltf.animations[0]) throw new Error('Dragonfly model is missing expected animated nodes.');
    const wingDelays = { frontLeft: 0, backLeft: 0.08, frontRight: 0.13, backRight: 0.18 };
    for (const [name, wing] of Object.entries(wings)) {
      const wingMaterial = track(insectMaterial.clone());
      // Share lighting and the progress uniform so ordinary rendering is
      // identical for body and wings. Only the brief opening differs by mesh.
      wingMaterial.uniforms = {
        ...insectMaterial.uniforms,
        uIntroWing: { value: 1 },
        uIntroWingDelay: { value: wingDelays[name] },
      };
      wing.traverse(object => { if (object.isMesh) object.material = wingMaterial; });
    }
    mixer = new AnimationMixer(gltf.scene);
    animation = mixer.clipAction(gltf.animations[0]);
    animation.play(); mixer.setTime(0);
    for (const [name, wing] of Object.entries(wings)) wing.rotation.z = finiteInRange(restored.wings?.[name], -Math.PI, Math.PI, wing.rotation.z);
    modelGroup.add(gltf.scene);
    modelTarget = track(new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: true, stencilBuffer: false }));
    trailTarget = track(new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false }));
    charactersTexture = makeCharacters();
    trailMaterial = track(new ShaderMaterial({
      uniforms: { uTrail: { value: trail }, uTrailStrength: { value: strength }, uTime: { value: 0 }, uVelocity: { value: 0 }, uResolution: { value: new Vector2(1, 1) } },
      vertexShader: trailVertex, fragmentShader: trailFragment, depthWrite: false, depthTest: false,
    }));
    asciiMaterial = track(new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: modelTarget.texture }, tMouseTrail: { value: trailTarget.texture }, uCharactersTexture: { value: charactersTexture },
        uResolution: { value: new Vector2(1, 1) }, uAspect: { value: 1 }, uGranularity: { value: 6 }, uCharactersLimit: { value: 16 },
        uIntroProgress: introUniform,
        uFillPixels: { value: false }, uOutProgress: { value: 0 }, uOpacity: { value: 1 }, uOverwriteColor: { value: true }, uGreyscale: { value: true },
        uInvert: { value: false }, uMatrix: { value: false }, uNoise: { value: false }, uSmear: { value: 0 },
        uColor: { value: new Color('#F2F2F2') }, uAccentColor: { value: new Color('#FA4C14') }, uBackground: { value: new Vector3(0, 0, 0) },
        uTime: { value: 0 }, uMedia: { value: false }, uScale: { value: 1 }, uOffset: { value: new Vector2(0, 0) }, uBrightness: { value: 0 },
      },
      vertexShader: asciiVertex, fragmentShader: introAsciiFragment, transparent: true, depthWrite: false, depthTest: false, blending: NormalBlending,
    }));
    const plane = new PlaneGeometry(2, 2); geometries.add(plane);
    trailScene.add(new Mesh(plane, trailMaterial));
    asciiScene.add(new Mesh(plane, asciiMaterial));
    canvas.setAttribute('aria-hidden', 'true');
    resize(); update(0);
    setIntroProgress(introOrigin === null ? (composition === 'intro' ? 0 : 1) : (performance.now() - introOrigin) / 1500);
    draw(); ready = true;
    pointerHandler = event => {
      pointerSeen = true; pointerMoves++;
      finePointerSeen = event.pointerType === 'mouse' && window.matchMedia('(any-pointer: fine)').matches;
      if (finePointerSeen) lastFinePointerTime = elapsed;
      target.set(Math.max(-1, Math.min(1, (event.clientX - left) / width * 2 - 1)), Math.max(-1, Math.min(1, 1 - (event.clientY - top) / height * 2)));
    };
    resizeHandler = scheduleResize;
    documentVisibilityHandler = syncRunning;
    focusHandler = () => { focused = true; syncRunning(); };
    blurHandler = () => { focused = false; syncRunning(); };
    window.addEventListener('pointermove', pointerHandler, { passive: true });
    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    document.addEventListener('visibilitychange', documentVisibilityHandler);
    if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(scheduleResize); observer.observe(canvas); }
    focused = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
    syncRunning();
    const controller = { dispose, pause, resume, setComposition, setIntroProgress, getState, exportState, captureFrame };
    canvas.dataset.dragonflyReady = 'true';
    canvas.dataset.dragonflyLoadMs = String(Math.round(performance.now() - created));
    onReady?.(controller);
    return controller;
  } catch (error) {
    dispose();
    throw error;
  }
}
