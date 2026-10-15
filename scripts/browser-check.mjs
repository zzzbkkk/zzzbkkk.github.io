// Browser QA against an already-open Chromium CDP endpoint; no npm dependencies.
// Usage: node scripts/browser-check.mjs ws://127.0.0.1:PORT/devtools/browser/ID
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
try {
  const targets=await call('Target.getTargets',{},null);
  const target=targets.targetInfos.find(t=>t.type==='page'&&t.url.startsWith(origin));
  if(!target)throw new Error('Open the local preview first.');
  session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
  await viewport(1440,900);await resetEntry();await navigate('/zh/');
  check('First homepage entry shows ASCII intro',await evaluate("!!document.querySelector('#intro')&&document.querySelector('#site').inert"));
  await capture('intro');await until('!!window.__introEndedAt');
  const duration=await evaluate('window.__introEndedAt-window.__introStartedAt');
  check('Intro including fade lasts 3 seconds',duration>=2980&&duration<3200,{duration});
  check('Intro restores interaction and keeps shared background',await evaluate("!document.querySelector('#intro')&&!document.querySelector('#site').inert&&document.querySelectorAll('.background-canvas').length===1"));
  await capture('desktop-zh');
  await navigate('/zh/');check('Same-session navigation does not replay',await evaluate('!window.__introStartedAt'));
  await call('Page.reload');await sleep(350);check('Refresh does not replay',await evaluate('!window.__introStartedAt'));
  const profileY=await evaluate("document.querySelector('[data-profile]').getBoundingClientRect().y");
  await call('Input.dispatchMouseEvent',{type:'mouseWheel',x:1050,y:600,deltaX:0,deltaY:500});await sleep(250);
  const scroll=await evaluate("({feed:document.querySelector('[data-work-feed]').scrollTop,page:scrollY,profile:document.querySelector('[data-profile]').getBoundingClientRect().y})");
  check('Desktop wheel scroll affects only work feed',scroll.feed>400&&scroll.page===0&&scroll.profile===profileY,scroll);
  await evaluate("document.querySelector('[data-work-feed]').focus()");await call('Input.dispatchKeyEvent',{type:'keyDown',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'PageDown',code:'PageDown',windowsVirtualKeyCode:34});await sleep(250);
  check('Work feed supports keyboard PageDown',await evaluate("document.querySelector('[data-work-feed]').scrollTop>500"));
  const previousScroll=await evaluate("document.querySelector('[data-work-feed]').scrollTop");
  await evaluate("document.querySelector('[data-work=drimo] [data-work-link]').click()");await until("location.pathname==='/zh/portfolio/drimo/'&&document.readyState==='complete'");
  await evaluate("document.querySelector('.identity-link').click()");await until("location.pathname==='/zh/'&&document.readyState==='complete'");await sleep(200);
  check('Returning from detail restores homepage feed',await evaluate(`Math.abs(document.querySelector('[data-work-feed]').scrollTop-${previousScroll})<5`));
  await evaluate("document.querySelector('a[data-language]').click()");await until("location.pathname==='/en/'&&document.readyState==='complete'");await sleep(200);
  check('Language switch keeps visible work',await evaluate("document.querySelector('[data-work=drimo]').getBoundingClientRect().top<innerHeight&&!window.__introStartedAt"));
  await evaluate("document.querySelector('[data-work-feed]').scrollTop=0");await capture('desktop-en');
  for(const lang of ['zh','en'])for(const [width,height] of [[320,700],[390,844],[768,1024],[1024,768],[1440,600],[720,450]]){
    await viewport(width,height);await navigate(`/${lang}/`);
    const metrics=await evaluate("({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,split:document.documentElement.hasAttribute('data-split'),overflow:getComputedStyle(document.querySelector('[data-work-feed]')).overflowY})");
    check(`Natural layout ${lang} ${width}x${height}`,metrics.scrollWidth<=metrics.width&&!metrics.split&&metrics.overflow!=='auto',metrics);
    if(width===390)await capture(`mobile-${lang}`);
  }
  await viewport(390,844);await navigate('/zh/');await evaluate("document.querySelector('[data-menu-toggle]').click()");
  check('Mobile menu opens with focus and inert background',await evaluate("!document.querySelector('#mobile-menu').hidden&&document.querySelector('#main').inert&&document.activeElement.closest('#mobile-menu')!==null"));
  await capture('mobile-menu');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await until("document.querySelector('#mobile-menu').hidden");
  check('Escape closes menu and returns focus',await evaluate("document.querySelector('#mobile-menu').hidden&&!document.querySelector('#main').inert&&document.activeElement.matches('[data-menu-toggle]')"));
  for(const lang of ['zh','en'])for(const route of ['portfolio/','blog/','about/','portfolio/openclaw-operations/','portfolio/yesoul-t5/','portfolio/oiioii/','portfolio/drimo/']){
    await navigate(`/${lang}/${route}`);check(`${lang}/${route} content route`,await evaluate("document.querySelectorAll('h1').length===1&&!document.querySelector('#intro')&&document.documentElement.scrollWidth<=innerWidth"));
  }
  await navigate('/en/portfolio/');
  for(const [value,count] of [['project',2],['analysis',2],['all',4]]){
    await evaluate(`document.querySelector('[data-filter=${value}]').click()`);
    check(`Portfolio ${value} filter`,await evaluate(`document.querySelectorAll('.portfolio-grid .work-card:not([hidden])').length===${count}`));
  }
  await evaluate("document.querySelector('[data-filter=analysis]').click();document.querySelector('a[data-language]').click()");await until("location.pathname==='/zh/portfolio/'&&document.readyState==='complete'");await sleep(100);
  check('Filter retained across languages',await evaluate("location.search==='?type=analysis'&&document.querySelectorAll('.portfolio-grid .work-card:not([hidden])').length===2"));
  await navigate('/en/portfolio/oiioii/');await evaluate("document.querySelector('a[data-language]').click()");await until("location.pathname==='/zh/portfolio/oiioii/'&&document.readyState==='complete'");check('Detail language switch preserves slug',true);
  await resetEntry();await navigate('/en/portfolio/drimo/');await evaluate("document.querySelector('.identity-link').click()");await until("location.pathname==='/en/'&&document.readyState==='complete'");check('Deep link then home does not replay intro',await evaluate('!window.__introStartedAt'));
  await resetEntry();await navigate('/zh/');await evaluate("document.querySelector('.intro-skip').click()");check('Skip immediately exits intro',await evaluate("!document.querySelector('#intro')&&!document.querySelector('#site').inert"));
  await resetEntry();await navigate('/zh/');await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});check('Escape exits intro and focuses main',await evaluate("!document.querySelector('#intro')&&document.activeElement.id==='main'"));
  await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await resetEntry();await navigate('/zh/');check('Reduced motion bypasses intro',await evaluate("!window.__introStartedAt&&!document.querySelector('#intro')"));await call('Emulation.setEmulatedMedia',{features:[]});
  await call('Network.setBlockedURLs',{urls:['*/art/*','*/visuals/*','*/fonts/*']});await viewport(1440,900);await resetEntry();await navigate('/zh/');await until('!!window.__introEndedAt');check('Failed art/fonts do not block content',await evaluate("!document.querySelector('#intro')&&document.querySelector('h1').innerText==='郑柏锴'&&document.documentElement.scrollWidth<=innerWidth"));await capture('fallback');await call('Network.setBlockedURLs',{urls:[]});
  await call('Emulation.setScriptExecutionDisabled',{value:true});await viewport(390,844);await navigate('/zh/');check('No-JS mobile keeps content and navigation',await evaluate("!document.documentElement.hasAttribute('data-intro')&&document.querySelector('.noscript-nav').getBoundingClientRect().height>0&&document.documentElement.scrollWidth<=innerWidth"));await capture('no-js');await call('Emulation.setScriptExecutionDisabled',{value:false});
  await viewport(1440,900);await navigate('/zh/');await evaluate("document.querySelector('[data-work-feed]').scrollTop=0");await capture('desktop-zh');
  check('No uncaught browser errors',errors.length===0,errors);
} catch(error){check('QA completed',false,error.message);}finally{
  await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
  socket.close();if(results.some(r=>!r.passed))process.exitCode=1;
}
