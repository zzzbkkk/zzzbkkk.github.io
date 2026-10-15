// Browser QA against an already-open Chromium CDP endpoint; no npm dependencies.
// Usage: node scripts/background-check.mjs ws://127.0.0.1:PORT/devtools/browser/ID
import { writeFile, mkdir } from 'node:fs/promises';
const endpoint=process.argv[2];
if(!endpoint?.startsWith('ws://127.0.0.1:'))throw new Error('Pass a local browser CDP WebSocket URL.');
const socket=new WebSocket(endpoint),pending=new Map(),errors=[],results=[],pausedModelRequests=new Set();
let nextId=0,session,otherTarget;
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const task=pending.get(m.id);pending.delete(m.id);if(m.error)task.reject(new Error(m.error.message));else task.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));else if(m.method==='Fetch.requestPaused'&&m.sessionId===session)pausedModelRequests.add(m.params.requestId);};
const call=(method,params={},sessionId=session)=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const check=(label,passed,detail)=>{results.push({label,passed:!!passed,detail});console.log(`${passed?'PASS':'FAIL'} ${label}${detail?' '+JSON.stringify(detail):''}`);};
const until=async(expression,timeout=5000)=>{const deadline=Date.now()+timeout;do{if(await evaluate(expression))return;await sleep(50);}while(Date.now()<deadline);throw new Error('Timed out: '+expression);};
const origin='http://127.0.0.1:4323';
async function navigate(route){await call('Page.navigate',{url:origin+route});await until(`location.pathname===${JSON.stringify(route)} && document.readyState==='complete'`);await evaluate('document.fonts.ready.then(()=>true)');await sleep(100);}
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100);}
async function capture(name){await mkdir('docs/qa',{recursive:true});const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`docs/qa/${name}.png`,Buffer.from(r.data,'base64'));}
async function resetEntry(){await evaluate("sessionStorage.removeItem('bk-entry')");}
async function checkContentBackground(label,route){
  if(route)await navigate(route);
  await until('window.__backgroundState?.().loaded&&window.__backgroundState().running');
  const state=await evaluate(`({
    route:location.pathname,width:innerWidth,
    loaded:window.__backgroundState().loaded,running:window.__backgroundState().running,
    canvasCount:document.querySelectorAll('.background-canvas').length,
    controlCount:document.querySelectorAll('[data-motion-toggle]').length,
    noIntro:!document.querySelector('#intro')&&!document.documentElement.hasAttribute('data-intro')&&!window.__introStartedAt,
    noOverflow:document.documentElement.scrollWidth<=innerWidth+1
  })`);
  check(label,state.loaded&&state.running&&state.canvasCount===1&&state.controlCount===1&&state.noIntro&&state.noOverflow,state);
}
async function clearModelInterception(){
  await Promise.allSettled([...pausedModelRequests].map(requestId=>call('Fetch.failRequest',{requestId,errorReason:'Aborted'})));
  await call('Fetch.disable').catch(()=>{});
  pausedModelRequests.clear();
}
try {
  const targets=await call('Target.getTargets',{},null);
  const target=targets.targetInfos.find(t=>t.type==='page'&&t.url.startsWith(origin));
  if(!target)throw new Error('Open the local preview first.');
  session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
  await call('Emulation.setEmulatedMedia',{features:[]});
  await evaluate("sessionStorage.setItem('bk-background-paused','false')");
  await viewport(1440,900);await resetEntry();await navigate('/zh/');
  await until('!!window.__introEndedAt');
  const duration=await evaluate('window.__introEndedAt-window.__introStartedAt');
  check('Three-second intro remains independent of WebGL loading',duration>=2980&&duration<3300,{duration});
  await until('window.__backgroundState?.().loaded');
  await sleep(250);
  const initial=await evaluate('window.__backgroundState()');
  await sleep(300);
  const animated=await evaluate('window.__backgroundState()');
  check('Original-model renderer keeps animating after intro',animated.frames>initial.frames&&animated.running,{initial,animated});
  check('Real wing rotations change over time',JSON.stringify(initial.wingAngles)!==JSON.stringify(animated.wingAngles));
  check('Untouched pointer skips trail passes while wings keep rendering',!initial.pointer.seen&&!animated.pointer.seen&&initial.trailDraws===0&&animated.trailDraws===0&&animated.frames>initial.frames,{initialTrailDraws:initial.trailDraws,trailDraws:animated.trailDraws,frames:animated.frames});
  const sameSize=await evaluate(`(async()=>{
    const before=window.__backgroundState().resizeCount;
    for(let i=0;i<12;i++)window.dispatchEvent(new Event('resize'));
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {before,after:window.__backgroundState().resizeCount};
  })()`);
  check('Repeated resize events at unchanged dimensions do no GPU resize',sameSize.before===sameSize.after,sameSize);
  await capture('interactive-desktop-idle');
  await evaluate("document.querySelector('[data-motion-toggle]').click()");await sleep(80);
  const paused=await evaluate('window.__backgroundState()');await sleep(150);
  const pausedAgain=await evaluate('window.__backgroundState()');
  check('Motion control pauses frames after the current frame settles',paused.userPaused&&!pausedAgain.running&&paused.frames===pausedAgain.frames,{before:paused.frames,after:pausedAgain.frames});
  await evaluate("document.querySelector('[data-motion-toggle]').click()");
  await until(`window.__backgroundState().running&&window.__backgroundState().frames>${pausedAgain.frames}`,1500);
  check('Motion control resumes the existing renderer',await evaluate("!window.__backgroundState().userPaused&&sessionStorage.getItem('bk-background-paused')==='false'"));
  await evaluate("document.querySelector('[data-motion-toggle]').click()");
  await navigate('/zh/portfolio/');
  const remembered=await evaluate("sessionStorage.getItem('bk-background-paused')==='true'");
  check('Home pause preference carries into the content page',remembered&&await evaluate("window.__backgroundState().userPaused&&!window.__backgroundState().loaded&&!window.__backgroundState().loading&&document.querySelectorAll('.background-canvas').length===1&&document.querySelectorAll('[data-motion-toggle]').length===1"));
  await evaluate("document.querySelector('a[data-language]').click()");
  await until("location.pathname==='/en/portfolio/'&&document.readyState==='complete'&&!!window.__backgroundState");
  check('Content language switch retains the paused background preference',await evaluate("window.__backgroundState().userPaused&&!window.__backgroundState().loaded&&!window.__backgroundState().loading&&document.querySelector('[data-motion-toggle]').dataset.paused==='true'"));
  await evaluate("document.querySelector('[data-motion-toggle]').click()");
  await until('window.__backgroundState?.().loaded&&window.__backgroundState().running');
  const contentResumeFrame=await evaluate('window.__backgroundState().frames');
  await until(`window.__backgroundState().frames>${contentResumeFrame}`,1500);
  check('Content background resumes animating and clears the stored pause preference',await evaluate("window.__backgroundState().running&&!window.__backgroundState().userPaused&&sessionStorage.getItem('bk-background-paused')==='false'"));
  // Each index page is loaded once while active; the two viewports split the
  // language coverage so each page type is exercised on desktop and mobile.
  await checkContentBackground('Desktop English portfolio has one live background and no intro or overflow');
  await checkContentBackground('Desktop Chinese blog has one live background and no intro or overflow','/zh/blog/');
  await checkContentBackground('Desktop Chinese about has one live background and no intro or overflow','/zh/about/');
  await navigate('/zh/');await until('window.__backgroundState?.().loaded');
  for(let i=0;i<24;i++){
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:100+i*22,y:220+i*20});await sleep(18);
  }
  const pointer=await evaluate('window.__backgroundState()');
  check('Mouse changes the smoothed pointer and 40-point trail',pointer.trailActive&&JSON.stringify(pointer.pointer)!==JSON.stringify(initial.pointer),pointer);
  await capture('interactive-desktop-pointer');
  const left=await evaluate("document.querySelector('[data-profile]').getBoundingClientRect().y");
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:1000,y:500,deltaX:0,deltaY:500});await sleep(250);
  check('Interactive background does not intercept work scrolling',await evaluate('document.querySelector("[data-work-feed]").scrollTop>400&&scrollY===0&&document.querySelector("[data-profile]").getBoundingClientRect().y==='+left));
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await sleep(200);
  check('Reduced motion releases runtime and leaves fallback',await evaluate("!window.__backgroundState().loaded&&!document.querySelector('.page-art').hasAttribute('data-live')&&document.querySelectorAll('.background-canvas').length===1"));
  try{
    // Hold the actual model request so loading cannot finish between samples.
    // Wait on the CDP event instead of inferring network progress from timing.
    await until('window.__backgroundState().reduced&&!window.__backgroundState().loading',1500);
    await call('Network.setCacheDisabled',{cacheDisabled:true});
    pausedModelRequests.clear();
    await call('Fetch.enable',{patterns:[{urlPattern:'*/models/dragonfly.glb',requestStage:'Request'}]});
    await call('Emulation.setEmulatedMedia',{features:[]});
    const requestDeadline=Date.now()+3000;
    while(!pausedModelRequests.size&&Date.now()<requestDeadline)await sleep(25);
    if(!pausedModelRequests.size)throw new Error('Timed out waiting for the intercepted dragonfly model request.');
    check('Intercepted model request holds the background in loading state',await evaluate('window.__backgroundState().loading&&!window.__backgroundState().loaded'));
    const cancelStarted=Date.now();
    await evaluate("document.querySelector('[data-motion-toggle]').click()");
    await until('!window.__backgroundState().loading&&!window.__backgroundState().loaded',1500);
    const cancelMs=Date.now()-cancelStarted;
    check('Cancelling a pending model load promptly releases the mount',cancelMs<1500&&await evaluate("!document.querySelector('.page-art').hasAttribute('data-live')&&document.querySelectorAll('.background-canvas').length===1"),{cancelMs});
  }finally{
    await clearModelInterception();
    await call('Network.setCacheDisabled',{cacheDisabled:false});
  }
  await evaluate("if(window.__backgroundState().userPaused)document.querySelector('[data-motion-toggle]').click()");
  await call('Emulation.setEmulatedMedia',{features:[]});await until('window.__backgroundState?.().loaded');
  check('Restoring motion after load cancellation remounts a usable single canvas',await evaluate("window.__backgroundState().running&&!window.__backgroundState().loading&&document.querySelectorAll('.background-canvas').length===1"));
  otherTarget=(await call('Target.createTarget',{url:'about:blank'},null)).targetId;
  await call('Target.activateTarget',{targetId:otherTarget},null);await sleep(500);
  const hidden=await evaluate('({visibility:document.visibilityState,state:window.__backgroundState()})');
  await sleep(300);const hidden2=await evaluate('window.__backgroundState()');
  check('Background tab stops scheduling render frames',hidden.state.frames===hidden2.frames&&!hidden2.running,hidden);
  await call('Target.closeTarget',{targetId:otherTarget},null);otherTarget=null;await call('Page.bringToFront');await sleep(300);
  check('Focus resumes rendering',await evaluate('window.__backgroundState().running'));
  await viewport(390,844);await navigate('/zh/');await until('window.__backgroundState?.().loaded');
  const mobile1=await evaluate('window.__backgroundState()');await sleep(350);const mobile2=await evaluate('window.__backgroundState()');
  check('Mobile keeps wing animation without hover',mobile2.frames>mobile1.frames&&JSON.stringify(mobile1.wingAngles)!==JSON.stringify(mobile2.wingAngles));
  check('Mobile layout still scrolls naturally',await evaluate("document.documentElement.scrollWidth<=innerWidth&&!document.documentElement.hasAttribute('data-split')"));
  await capture('interactive-mobile');
  await evaluate("document.querySelector('[data-menu-toggle]').click()");
  check('Menu stays clickable above canvas',await evaluate("document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded')==='true'"));
  await checkContentBackground('Mobile Chinese portfolio has one live background and no intro or overflow','/zh/portfolio/');
  const detailRoute=await evaluate("new URL(document.querySelector('a[data-work-link]').href).pathname");
  await checkContentBackground('Mobile English blog has one live background and no intro or overflow','/en/blog/');
  await checkContentBackground('Mobile English about has one live background and no intro or overflow','/en/about/');
  await checkContentBackground('Work detail has one live background and no intro or overflow',detailRoute);
  await call('Network.setBlockedURLs',{urls:['*/models/*']});await navigate('/zh/');await sleep(1500);
  check('Model failure retains readable static homepage',await evaluate("!window.__backgroundState().loaded&&!document.querySelector('.page-art').hasAttribute('data-live')&&document.querySelector('h1').innerText==='郑柏锴'"));
  await call('Network.setBlockedURLs',{urls:[]});await viewport(1440,900);await navigate('/zh/');await until('window.__backgroundState?.().loaded');
  await evaluate("document.querySelector('.background-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()");await sleep(200);
  check('Context loss falls back without blocking page',await evaluate("!document.querySelector('.page-art').hasAttribute('data-live')&&!document.querySelector('#site').inert"));
  await navigate('/zh/');await until('window.__backgroundState?.().loaded');await capture('interactive-desktop-final');
  check('No uncaught browser exceptions',errors.length===0,errors);
} catch(error){check('Background QA completed',false,error.stack);}finally{
  if(session){
    // Restore browser settings even if an assertion setup or navigation fails.
    await clearModelInterception();
    await Promise.allSettled([
      call('Network.setCacheDisabled',{cacheDisabled:false}),
      call('Network.setBlockedURLs',{urls:[]}),
    ]);
    await evaluate("sessionStorage.setItem('bk-background-paused','false');if(window.__backgroundState?.().userPaused)document.querySelector('[data-motion-toggle]')?.click()").catch(()=>{});
    await call('Emulation.setEmulatedMedia',{features:[]}).catch(()=>{});
    if(otherTarget)await call('Target.closeTarget',{targetId:otherTarget},null).catch(()=>{});
    await call('Page.bringToFront').catch(()=>{});
  }
  await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/background-results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
  socket.close();if(results.some(r=>!r.passed))process.exitCode=1;
}
