// Browser QA against an already-open Chromium CDP endpoint; no npm dependencies.
// Usage: node scripts/ribbon-check.mjs ws://127.0.0.1:PORT/devtools/browser/ID
import { writeFile, mkdir } from 'node:fs/promises';
const endpoint=process.argv[2];
if(!endpoint?.startsWith('ws://127.0.0.1:'))throw new Error('Pass a local browser CDP WebSocket URL.');
const socket=new WebSocket(endpoint),pending=new Map(),errors=[],results=[];
let nextId=0,session;
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
socket.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const task=pending.get(m.id);pending.delete(m.id);if(m.error)task.reject(new Error(m.error.message));else task.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+': '+(m.params.exceptionDetails.exception?.description||''));};
const call=(method,params={},sessionId=session)=>new Promise((resolve,reject)=>{const id=++nextId;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
const check=(label,passed,detail)=>{results.push({label,passed:!!passed,detail});console.log(`${passed?'PASS':'FAIL'} ${label}${detail?' '+JSON.stringify(detail):''}`);};
const until=async(expression)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await sleep(50);}throw new Error('Timed out: '+expression);};
const origin='http://127.0.0.1:4323';
async function navigate(route){await call('Page.navigate',{url:origin+route});await until(`location.pathname===${JSON.stringify(route)} && document.readyState==='complete'`);await evaluate('document.fonts.ready.then(()=>true)');await sleep(100);}
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await sleep(100);}
async function capture(name){await mkdir('docs/qa',{recursive:true});const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(`docs/qa/${name}.png`,Buffer.from(r.data,'base64'));}
async function resetEntry(){await evaluate("sessionStorage.removeItem('bk-entry')");}
async function openScene(route,scene='ribbon'){
  await call('Page.navigate',{url:origin+route+'?scene='+scene});
  await until(`location.pathname===${JSON.stringify(route)}&&document.readyState==='complete'&&!!window.__backgroundState`);
  await evaluate('document.fonts.ready.then(()=>true)');await sleep(200);
}
const choose=async scene=>{await evaluate(`document.querySelector('[data-scene-choice=${scene}]').click()`);};
let otherTarget;
try {
 const targets=await call('Target.getTargets',{},null);
 const target=targets.targetInfos.find(t=>t.type==='page'&&t.url.startsWith(origin));
 if(!target)throw new Error('Open local preview first');
 session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
 await call('Emulation.setEmulatedMedia',{features:[]});
 await evaluate("sessionStorage.clear()");await viewport(1440,900);await navigate('/zh/');
 await until('window.__backgroundState?.().loaded');
 check('Fresh session defaults to ribbon with no dragonfly model download',await evaluate("window.__backgroundState().scene==='ribbon'&&window.__backgroundState().source==='procedural-ascii-ribbon'&&!performance.getEntriesByType('resource').some(r=>r.name.includes('/models/'))"));
 await capture('ribbon-intro');await until('!!window.__introEndedAt');
 const duration=await evaluate('window.__introEndedAt-window.__introStartedAt');
 check('Ribbon intro completes in two seconds and releases page',duration>=1980&&duration<2300&&await evaluate("!document.querySelector('#site').inert&&!document.querySelector('#intro')"),{duration});
 const first=await evaluate('window.__backgroundState()');await sleep(400);const second=await evaluate('window.__backgroundState()');
 check('Ribbon continues its slow motion after entry',second.running&&second.frames>first.frames&&second.elapsed>first.elapsed,{frames:first.frames,next:second.frames});
 await capture('ribbon-home');
 for(let i=0;i<16;i++){await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:500+i*12,y:620-i*8});await sleep(20);}
 const pointer=await evaluate('window.__backgroundState()');
 check('Ribbon receives real pointer input',pointer.pointer?.seen===true,pointer.pointer);
 await capture('ribbon-pointer');
 await evaluate("document.querySelector('[data-motion-toggle]').click()");await sleep(100);
 const paused=await evaluate('window.__backgroundState()');await sleep(200);
 check('Pause freezes ribbon frames',paused.userPaused&&!paused.running&&await evaluate(`window.__backgroundState().frames===${paused.frames}`));
 await choose('dragonfly');
 check('Paused switch shows original static shape without starting animation',await evaluate("window.__backgroundState().scene==='dragonfly'&&window.__backgroundState().userPaused&&!window.__backgroundState().loaded&&document.querySelector('.page-art-fallback').src.endsWith('/dragonfly-ascii.svg')"));
 await choose('ribbon');
 check('Paused switch back shows ribbon fallback',await evaluate("document.querySelector('.page-art-fallback').src.endsWith('/ribbon-ascii.svg')&&!window.__backgroundState().loading"));
 await evaluate("document.querySelector('[data-motion-toggle]').click()");await until('window.__backgroundState().loaded&&window.__backgroundState().running');
 await choose('dragonfly');await until("window.__backgroundState().source==='original-model-and-shaders'");
 const original1=await evaluate('window.__backgroundState()');await sleep(300);const original2=await evaluate('window.__backgroundState()');
 check('Original model and wing animation remain available',original2.scene==='dragonfly'&&JSON.stringify(original1.wingAngles)!==JSON.stringify(original2.wingAngles));
 await capture('ribbon-original-compare');
 await choose('ribbon');await until("window.__backgroundState().source==='procedural-ascii-ribbon'");
 const prior=await evaluate('window.__backgroundState().elapsed');
 await evaluate("document.querySelector('.desktop-navigation a[href=\"/zh/portfolio/\"]').click()");
 await until("location.pathname==='/zh/portfolio/'&&window.__backgroundState?.().loaded");
 check('Navigation retains chosen shape and timeline',await evaluate(`window.__backgroundState().scene==='ribbon'&&window.__backgroundState().elapsed>=${prior}&&new URL(location.href).searchParams.get('scene')==='ribbon'&&document.querySelector('.page-art').hasAttribute('data-resume-frame')`));
 await evaluate("document.querySelector('a[data-language]').click()");await until("location.pathname==='/en/portfolio/'&&window.__backgroundState?.().loaded");
 check('Language switch retains ribbon',await evaluate("window.__backgroundState().scene==='ribbon'&&document.querySelector('[data-scene-choice=ribbon]').getAttribute('aria-pressed')==='true'"));
 await choose('dragonfly');await until("window.__backgroundState().source==='original-model-and-shaders'");
 await evaluate('history.back()');await until("location.pathname==='/zh/portfolio/'&&window.__backgroundState?.().loaded");
 check('Browser Back restores the shape specified by its URL',await evaluate("window.__backgroundState().scene==='ribbon'&&document.documentElement.dataset.scene==='ribbon'"));
 // A delayed original-model request must not overtake the new 2D renderer.
 await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Network.emulateNetworkConditions',{offline:false,latency:700,downloadThroughput:1000000,uploadThroughput:1000000});
 await choose('dragonfly');await sleep(80);await choose('ribbon');await choose('dragonfly');await choose('ribbon');
 await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await until("window.__backgroundState().loaded&&window.__backgroundState().scene==='ribbon'");await sleep(900);
 check('Rapid switches cancel old loads and retain one working canvas',await evaluate("window.__backgroundState().running&&window.__backgroundState().source==='procedural-ascii-ribbon'&&!window.__backgroundState().loading&&document.querySelectorAll('.background-canvas').length===1&&document.querySelector('.page-art').hasAttribute('data-live')"));
 await call('Network.setCacheDisabled',{cacheDisabled:false});
 otherTarget=(await call('Target.createTarget',{url:'about:blank'},null)).targetId;
 await call('Target.activateTarget',{targetId:otherTarget},null);await sleep(300);
 const bg=await evaluate('window.__backgroundState()');await sleep(200);
 check('Hidden tab stops ribbon render frames',!bg.running&&await evaluate(`window.__backgroundState().frames===${bg.frames}`));
 await call('Target.closeTarget',{targetId:otherTarget},null);otherTarget=null;await call('Page.bringToFront');await sleep(200);
 check('Returning to tab resumes ribbon',await evaluate('window.__backgroundState().running'));
 for(const lang of ['zh','en'])for(const [w,h] of [[320,760],[390,844],[1440,900]])for(const path of ['', 'portfolio/','blog/','about/','portfolio/drimo/']){
   await viewport(w,h);await openScene(`/${lang}/${path}`);await until('window.__backgroundState().loaded');
   const m=await evaluate(`(()=>{const control=document.querySelector('.background-controls').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,controlsFit:control.left>=0&&control.right<=innerWidth,canvas:document.querySelectorAll('.background-canvas').length,scene:window.__backgroundState().scene};})()`);
   check(`Ribbon layout ${lang}/${path} ${w}`,!m.overflow&&m.controlsFit&&m.canvas===1&&m.scene==='ribbon',m);
   if(lang==='zh'&&w===1440&&path==='about/')await capture('ribbon-reading');
   if(lang==='zh'&&w===1440&&path==='portfolio/')await capture('ribbon-portfolio');
   if(lang==='en'&&w===320&&path==='')await capture('ribbon-mobile-en');
   if(lang==='zh'&&w===390&&path==='')await capture('ribbon-mobile');
 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await openScene('/zh/');
 check('Reduced motion shows ribbon static art and hides pause only',await evaluate("!window.__backgroundState().loaded&&!document.querySelector('#intro')&&document.querySelector('[data-motion-toggle]').hidden&&!document.querySelector('[data-scene-picker]').hidden&&document.querySelector('.page-art-fallback').src.endsWith('/ribbon-ascii.svg')"));
 await choose('dragonfly');
 check('Reduced motion can compare original static art',await evaluate("!window.__backgroundState().loaded&&document.querySelector('.page-art-fallback').src.endsWith('/dragonfly-ascii.svg')"));
 await choose('ribbon');
 // Let the reduced-motion document paint before reverting the emulated OS
 // setting; Chromium otherwise may coalesce both media changes in one frame.
 await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await until('window.__backgroundState().loaded');
 check('Turning motion back on remounts chosen scene',await evaluate("window.__backgroundState().running&&window.__backgroundState().source==='procedural-ascii-ribbon'"));
 await call('Emulation.setScriptExecutionDisabled',{value:true});await viewport(390,844);await navigate('/zh/');
 check('No-JS keeps content and ribbon fallback',await evaluate("document.querySelector('.page-art-fallback').src.endsWith('/ribbon-ascii.svg')&&document.querySelector('h1').textContent==='郑柏锴'&&document.documentElement.scrollWidth<=innerWidth&&!document.documentElement.hasAttribute('data-intro')"));
 await call('Emulation.setScriptExecutionDisabled',{value:false});await viewport(1440,900);await openScene('/zh/');await until('window.__backgroundState().loaded');await sleep(350);await capture('ribbon-home');
 check('No uncaught browser exceptions',errors.length===0,errors);
} catch(error){check('Ribbon QA completed',false,error.stack);} finally {
 if(session){
  await call('Emulation.setScriptExecutionDisabled',{value:false}).catch(()=>{});
  await call('Emulation.setEmulatedMedia',{features:[]}).catch(()=>{});
  await call('Network.setCacheDisabled',{cacheDisabled:false}).catch(()=>{});
  await call('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});
  if(otherTarget)await call('Target.closeTarget',{targetId:otherTarget},null).catch(()=>{});
 }
 await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/ribbon-results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
 socket.close();if(results.some(r=>!r.passed))process.exitCode=1;
}
