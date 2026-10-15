// Browser QA against an already-open Chromium CDP endpoint; no npm dependencies.
// Usage: node scripts/motion-check.mjs ws://127.0.0.1:PORT/devtools/browser/ID
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
 await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"addEventListener('pagereveal',e=>{window.__qaTransition=!!e.viewTransition});"});
 await viewport(1440,900);await navigate('/zh/');await evaluate("sessionStorage.removeItem('bk-entry');sessionStorage.removeItem('bk-seen-work')");await navigate('/zh/');
 await until("document.documentElement.classList.contains('intro-reveal')");
 const stages=await evaluate("[document.querySelector('.site-header'),document.querySelector('.profile-content'),document.querySelector('.work-card')].map(e=>getComputedStyle(e).animationDelay)");
 check('Intro reveals navigation, profile and first work with 90ms steps',stages.join(',')==='0s,0.09s,0.18s',stages);await capture('motion-intro-transition');
 await until('!!window.__introEndedAt');
 check('Intro completes all staged motion by 3 seconds',await evaluate("window.__introEndedAt-window.__introStartedAt<3200&&!document.documentElement.classList.contains('intro-reveal')&&!document.querySelector('#site').inert"));
 await until('window.__backgroundState?.().loaded');await sleep(250);
 for(const slug of ['openclaw-operations','oiioii','drimo','yesoul-t5']) {
  await evaluate(`document.querySelector('[data-work=${slug}]').scrollIntoView({block:'center',behavior:'instant'})`);await sleep(100);
  const box=await evaluate(`document.querySelector('[data-work=${slug}] .work-cover').getBoundingClientRect().toJSON()`);
  await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:400});await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(box.x+100),y:Math.round(Math.max(100,box.y+60))});await sleep(200);
  check(`${slug} hover plays content diagram`,await evaluate(`document.querySelector('[data-work=${slug}] .work-cover').hasAttribute('data-cover-active')`));
  if(slug==='oiioii')await capture('motion-cover-hover');
  await sleep(1100);check(`${slug} sequence stops without looping`,await evaluate(`!document.querySelector('[data-work=${slug}] .work-cover').hasAttribute('data-cover-active')`));
 }
 await evaluate("document.querySelector('[data-work-feed]').scrollTop=0");
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:50,y:400});
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await evaluate("document.querySelector('[data-work=oiioii] [data-work-link]').focus()");
 check('Keyboard focus triggers the same cover feedback',await evaluate("document.querySelector('[data-work=oiioii] .work-cover').hasAttribute('data-cover-active')"));
 await sleep(950);await evaluate("document.querySelector('[data-work=oiioii] .work-card-action a').focus()");
 check('Moving focus inside card does not replay',await evaluate("!document.querySelector('[data-work=oiioii] .work-cover').hasAttribute('data-cover-active')"));
 // Clear seen works once to exercise first exposure, then return to the same card.
 await evaluate("sessionStorage.removeItem('bk-seen-work')");await navigate('/zh/');await sleep(300);
 await evaluate("document.querySelector('[data-work=yesoul-t5]').scrollIntoView({block:'start',behavior:'instant'})");await sleep(70);
 const reveal=await evaluate("({marked:document.querySelector('[data-work=yesoul-t5]').dataset.revealed,animations:document.querySelector('[data-work=yesoul-t5]').getAnimations().length})");
 check('Newly visible work receives a finite reveal',reveal.marked==='true'&&reveal.animations>0,reveal);await sleep(260);
 await evaluate("document.querySelector('[data-work-feed]').scrollTop=0");await sleep(40);await evaluate("document.querySelector('[data-work=yesoul-t5]').scrollIntoView({block:'start',behavior:'instant'})");await sleep(50);
 check('Previously viewed work does not reveal again',await evaluate("document.querySelector('[data-work=yesoul-t5]').getAnimations().length===0"));
 const before=await evaluate('window.__backgroundState().elapsed');
 await evaluate("document.querySelector('.desktop-navigation a[href=\"/zh/portfolio/\"]').click()");await until("location.pathname==='/zh/portfolio/'&&document.readyState==='complete'");await until('window.__backgroundState?.().loaded');
 const continuity=await evaluate("({transition:window.__qaTransition,frame:document.querySelector('.page-art').hasAttribute('data-resume-frame'),elapsed:window.__backgroundState().elapsed,composition:window.__backgroundState().composition})");
 check('Navigation uses shared-element transition and retained scene',continuity.transition&&continuity.frame&&continuity.elapsed>=before&&continuity.composition==='portfolio',continuity);
 await until("!document.documentElement.classList.contains('route-transition')");await sleep(100);
 const buttonBox=await evaluate("document.querySelector('[data-filter=all]').getBoundingClientRect().toJSON()");
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:buttonBox.x+20,y:buttonBox.y+20});
 await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,x:buttonBox.x+20,y:buttonBox.y+20});await sleep(120);
 check('Button press reaches the 98 percent tactile state',await evaluate("getComputedStyle(document.querySelector('[data-filter=all]')).transform.startsWith('matrix(0.98,')"));
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:buttonBox.x+20,y:buttonBox.y+20});
 await evaluate("sessionStorage.removeItem('bk-seen-work')");await navigate('/zh/');await until('window.__backgroundState?.().loaded');await sleep(250);
 await evaluate("document.querySelector('.desktop-navigation a[href=\"/zh/portfolio/\"]').click()");await until("location.pathname==='/zh/portfolio/'&&window.__backgroundState?.().loaded");
 await evaluate("document.querySelector('[data-motion-toggle]').click();history.back()");await until("location.pathname==='/zh/'&&window.__backgroundState?.().userPaused");await sleep(200);
 check('Browser Back respects pause chosen on another page',await evaluate("window.__backgroundState().userPaused&&document.querySelector('[data-motion-toggle]').dataset.paused==='true'"));
 await evaluate("document.querySelector('[data-work=yesoul-t5]').scrollIntoView({block:'start',behavior:'instant'})");await sleep(70);
 check('Unseen work can still reveal after browser Back',await evaluate("document.querySelector('[data-work=yesoul-t5]').dataset.revealed==='true'&&document.querySelector('[data-work=yesoul-t5]').getAnimations().length>0"));
 await evaluate("document.querySelector('[data-motion-toggle]').click()");await until('window.__backgroundState?.().loaded');
 await navigate('/zh/about/');await until('window.__backgroundState?.().loaded');await sleep(700);await capture('motion-reading');
 check('Reading composition moves dragonfly away from text',await evaluate("window.__backgroundState().composition==='reading'&&window.__backgroundState().framing.effectiveOffset>.15"));
 await navigate('/zh/blog/');await until('window.__backgroundState?.().loaded');await sleep(700);await capture('motion-blog');
 check('Blog composition shows a smaller silhouette',await evaluate("window.__backgroundState().composition==='blog'&&window.__backgroundState().framing.zoom>1.1"));
 await navigate('/zh/portfolio/oiioii/');await sleep(250);await evaluate("document.querySelector('.article-outline a').click()");
 await until("!!document.querySelector('.article-section.arrived')");
 const arrival=await evaluate("({focus:document.activeElement.tagName,y:document.querySelector('.article-section.arrived').getBoundingClientRect().top,header:document.querySelector('.site-header').getBoundingClientRect().bottom,hash:location.hash})");
 check('Chapter link lands below navigation and acknowledges location',arrival.focus==='H2'&&arrival.y>=arrival.header&&arrival.hash==='#scenario',arrival);await capture('motion-section-arrival');
 await viewport(390,844);await navigate('/en/');await sleep(300);
 await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}})");
 const width=await evaluate("document.querySelector('[data-copy-email]').getBoundingClientRect().width");await evaluate("document.querySelector('[data-copy-email]').click()");await sleep(200);
 check('Copy success changes label without button width shift',await evaluate(`document.querySelector('[data-copy-email]').textContent==='Copied'&&document.querySelector('[data-copy-status]').textContent==='Copied'&&document.querySelector('[data-copy-email]').getBoundingClientRect().width===${width}`));
 await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}});document.querySelector('[data-copy-email]').click()");await sleep(200);
 check('Copy failure keeps a visible instruction and selects the address',await evaluate("document.querySelector('[data-copy-email]').textContent==='Selected; copy manually'&&getSelection().toString()==='18050160888@163.com'"));
 await evaluate("document.querySelector('[data-menu-toggle]').click()");await sleep(50);
 check('Mobile menu unfolds while content is isolated',await evaluate("!document.querySelector('#mobile-menu').hidden&&document.querySelector('#main').inert&&document.querySelector('#mobile-menu').getAnimations().length>0"));await sleep(180);await capture('motion-mobile-menu');
 await evaluate("document.querySelector('[data-menu-toggle]').click();document.querySelector('[data-menu-toggle]').click()");await sleep(200);
 check('Rapid close and reopen preserves an operable menu',await evaluate("!document.querySelector('#mobile-menu').hidden&&!document.querySelector('#mobile-menu').inert&&document.querySelector('[data-menu-toggle]').getAttribute('aria-expanded')==='true'&&document.querySelector('#main').inert"));
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await sleep(150);
 check('Menu close releases content and restores focus',await evaluate("document.querySelector('#mobile-menu').hidden&&!document.querySelector('#main').inert&&document.activeElement.matches('[data-menu-toggle]')"));
 for(const lang of ['zh','en'])for(const width of [320,390,768,1440])for(const path of ['portfolio/','portfolio/drimo/']){
  await viewport(width,900);await navigate(`/${lang}/${path}`);await sleep(250);
  const bounds=await evaluate(`(()=>{const clipped=[];for(const c of document.querySelectorAll('.work-cover')){const b=c.getBoundingClientRect(),p=c.parentElement.getBoundingClientRect();if(b.right>p.right+1)clipped.push('cover');const walk=document.createTreeWalker(c,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);for(const a of r.getClientRects())if(a.left<b.left-1||a.right>b.right+1||a.bottom>b.bottom+1)clipped.push(n.textContent)}}return {overflow:document.documentElement.scrollWidth>innerWidth,clipped}})()`);
  check(`Cover remains readable ${lang} ${path} ${width}`,!bounds.overflow&&!bounds.clipped.length,bounds);
  if(lang==='en'&&width===320&&path==='portfolio/'){await evaluate("document.querySelector('[data-work=drimo]').scrollIntoView({block:'start',behavior:'instant'})");await capture('motion-mobile-diagram');}
 }
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await viewport(390,844);await navigate('/zh/');await sleep(300);await evaluate("document.querySelector('[data-menu-toggle]').click()");
 check('Reduced motion keeps menu and content functional without animation',await evaluate("!document.querySelector('#mobile-menu').hidden&&document.getAnimations().filter(a=>a.playState==='running').length===0&&!document.querySelector('#intro')"));
 await evaluate("document.querySelector('[data-menu-toggle]').click()");
 check('Reduced motion closes menu immediately',await evaluate("document.querySelector('#mobile-menu').hidden&&!document.querySelector('#main').inert"));
 await call('Emulation.setEmulatedMedia',{features:[]});await viewport(1440,900);await navigate('/zh/');await until('window.__backgroundState?.().loaded');await sleep(500);await capture('motion-home');
 check('No uncaught runtime errors',errors.length===0,errors);
} catch(error){check('Motion QA completed',false,error.message)}finally{
 await mkdir('docs/qa',{recursive:true});await writeFile('docs/qa/motion-results.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
 socket.close();if(results.some(r=>!r.passed))process.exitCode=1;
}
