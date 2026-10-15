// Browser QA against an already-open Chromium CDP endpoint; no npm dependencies.
// Usage: node scripts/intro-check.mjs ws://127.0.0.1:PORT/devtools/browser/ID
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
let injection,recording=false;const video=[],held=new Set();
socket.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.sessionId!==session)return;if(m.method==='Fetch.requestPaused')held.add(m.params.requestId);if(m.method==='Page.screencastFrame'){if(recording)video.push({t:m.params.metadata.timestamp,data:m.params.data});call('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{})}});
try {
 const targets=await call('Target.getTargets',{},null),target=targets.targetInfos.find(t=>t.type==='page'&&t.url.startsWith(origin));
 session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');await call('Emulation.setEmulatedMedia',{features:[]});
 await evaluate("sessionStorage.setItem('bk-background-paused','false')");
 injection=await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.__introSamples=[];const timer=setInterval(()=>{if(typeof window.__introStartedAt!=='number')return;const t=performance.now()-window.__introStartedAt,s=window.__backgroundState?.(),n=document.querySelector('.intro-name'),f=document.querySelector('.page-art-fallback');window.__introSamples.push({t,loaded:s?.loaded,phase:s?.introPhase,progress:s?.introProgress,composition:s?.composition,x:s?.framing?.x,zoom:s?.framing?.zoom,name:n?Number(getComputedStyle(n).opacity):null,fallback:f?Number(getComputedStyle(f).opacity):null,inert:document.querySelector('#site')?.inert});if(t>3300)clearInterval(timer)},40);`});
 for(const [width,height,lang] of [[1440,900,'zh'],[390,844,'zh'],[320,700,'en']]){
  await viewport(width,height);await resetEntry();
  if(width===1440){recording=true;await call('Page.startScreencast',{format:'png',maxWidth:960,maxHeight:600,everyNthFrame:1})}
  await navigate(`/${lang}/`);
  await until('performance.now()-window.__introStartedAt>=975');await capture(`intro-body-${width}`);
  await until('performance.now()-window.__introStartedAt>=1875');await capture(`intro-name-${width}`);
  await until('!!window.__introEndedAt');await sleep(250);
  if(width===1440){recording=false;await call('Page.stopScreencast');const epoch=await evaluate('(performance.timeOrigin+window.__introStartedAt)/1000');await writeFile('docs/qa/intro-recording-frames.json',JSON.stringify({start:epoch,frames:video.filter(f=>f.t>=epoch&&f.t<=epoch+3.3)}))}
  const samples=await evaluate('window.__introSamples'),during=samples.filter(s=>s.loaded&&s.t<2925);
  const timing=await evaluate('window.__introEndedAt-window.__introStartedAt');
  check(`${width}px entire entry and fade finish in three seconds`,timing>=2980&&timing<3200,{timing});
  check(`${width}px dragonfly stays centered until entry ends`,during.length>12&&during.every(s=>s.composition==='intro'&&s.x===0&&s.zoom===1));
  check(`${width}px wing edges precede body formation`,during.some(s=>s.phase==='wing-edges')&&during.some(s=>s.phase==='body-reveal'),{phases:[...new Set(during.map(s=>s.phase))]});
  check(`${width}px name stays hidden until 1350ms and then becomes legible`,samples.filter(s=>s.t<1330).every(s=>s.name===0)&&samples.some(s=>s.t>1790&&s.t<2340&&s.name===1));
  check(`${width}px static fallback never overlays the live model`,during.every(s=>s.fallback===0));
  check(`${width}px homepage unlocks with original navigation and four diagrams`,await evaluate("!document.querySelector('#site').inert&&document.querySelectorAll('.work-card').length===4&&!document.querySelector('.cover-artwork-image')&&parseFloat(getComputedStyle(document.querySelector('.site-header')).borderRadius)>100&&window.__backgroundState().introProgress===1&&document.documentElement.scrollWidth<=innerWidth"));
 }
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});injection=null;
 await viewport(1440,900);await resetEntry();await navigate('/zh/');await until('window.__backgroundState?.().loaded');await evaluate("document.querySelector('.intro-skip').click()");
 check('Skip reveals the normal material and usable homepage immediately',await evaluate("!document.querySelector('#intro')&&!document.querySelector('#site').inert&&window.__backgroundState().introProgress===1&&window.__backgroundState().composition==='home'"));
 await resetEntry();await navigate('/zh/');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 check('Escape cancels the sequence and returns keyboard focus',await evaluate("!document.querySelector('#intro')&&!document.querySelector('#site').inert&&document.activeElement.id==='main'"));
 await navigate('/zh/');check('Refreshing in the same session does not replay',await evaluate('!window.__introStartedAt'));
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await resetEntry();await navigate('/zh/');
 check('Reduced motion bypasses entry and the runtime',await evaluate('!window.__introStartedAt&&!window.__backgroundState().loaded&&!document.querySelector("#site").inert'));await call('Emulation.setEmulatedMedia',{features:[]});
 await call('Network.setCacheDisabled',{cacheDisabled:true});await call('Fetch.enable',{patterns:[{urlPattern:'*/models/dragonfly.glb',requestStage:'Request'}]});await resetEntry();await navigate('/zh/');await until('!!window.__introEndedAt');
 check('Slow model does not delay entry or block the page',held.size>0&&await evaluate('window.__introEndedAt-window.__introStartedAt<3200&&!window.__backgroundState().loaded&&!document.querySelector("#site").inert'));
 for(const requestId of held)await call('Fetch.continueRequest',{requestId});held.clear();await call('Fetch.disable');await until('window.__backgroundState?.().loaded');
 check('Late model appears fully formed in the home composition',await evaluate('window.__backgroundState().introProgress===1&&window.__backgroundState().composition==="home"&&Math.abs(window.__backgroundState().framing.x+.2)<.001'));
 await call('Network.setCacheDisabled',{cacheDisabled:false});await navigate('/zh/about/');await until('window.__backgroundState?.().loaded');
 check('Content pages retain normal fully formed background',await evaluate('window.__backgroundState().introProgress===1&&!window.__introStartedAt'));
 await navigate('/zh/');await until('window.__backgroundState?.().loaded');await sleep(250);await capture('intro-updated-home');
 check('No uncaught runtime exceptions',errors.length===0,errors);
} catch(error){check('Intro QA completed',false,error.stack)}finally{
 if(injection)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection.identifier});
 for(const requestId of held)await call('Fetch.failRequest',{requestId,errorReason:'Aborted'}).catch(()=>{});
 await call('Fetch.disable').catch(()=>{});await call('Page.stopScreencast').catch(()=>{});await call('Network.setCacheDisabled',{cacheDisabled:false}).catch(()=>{});await call('Emulation.setEmulatedMedia',{features:[]}).catch(()=>{});
 await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/intro-sequence-results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));socket.close();if(results.some(r=>!r.passed))process.exitCode=1;
}
