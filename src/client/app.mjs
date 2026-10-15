import { setupBackground } from './background.mjs';
import { playMotion, setupPageMotion } from './page-motion.mjs';
import { setupCoverMotion } from './cover-motion.mjs';
const $=selector=>document.querySelector(selector);
const store={get(key){try{return sessionStorage.getItem(key)}catch{return null}},set(key,value){try{sessionStorage.setItem(key,value)}catch{}},remove(key){try{sessionStorage.removeItem(key)}catch{}}};
const header=$('[data-header]'),toggle=$('[data-menu-toggle]'),menu=$('#mobile-menu'),main=$('#main');
let scrim,menuAnimation,menuRun=0;
function closeMenu(restore=false,immediate=false){
  if(!toggle)return;
  const run=++menuRun;menuAnimation?.cancel();
  toggle.setAttribute('aria-expanded','false');toggle.textContent=toggle.dataset.openLabel;menu.inert=true;
  const finish=()=>{
    if(run!==menuRun)return;
    menu.hidden=true;document.documentElement.classList.remove('menu-open');scrim?.remove();scrim=null;
    if(!document.documentElement.hasAttribute('data-intro'))main.inert=false;
  };
  if(restore)toggle.focus();
  menuAnimation=!immediate&&!menu.hidden?playMotion(menu,[{opacity:1,clipPath:'inset(0 0 0 0 round 20px)'},{opacity:0,clipPath:'inset(0 0 100% 0 round 20px)'}],{duration:120}):null;
  if(menuAnimation)menuAnimation.finished.then(finish,finish);else finish();
}
function openMenu(){
  ++menuRun;menuAnimation?.cancel();
  toggle.setAttribute('aria-expanded','true');toggle.textContent=toggle.dataset.closeLabel;menu.hidden=false;menu.inert=false;
  document.documentElement.classList.add('menu-open');main.inert=true;
  if(!scrim){scrim=document.createElement('div');scrim.className='menu-scrim';scrim.setAttribute('aria-hidden','true');document.body.append(scrim);scrim.addEventListener('click',()=>closeMenu(true));}
  menuAnimation=playMotion(menu,[{opacity:0,clipPath:'inset(0 0 100% 0 round 20px)'},{opacity:1,clipPath:'inset(0 0 0 0 round 20px)'}]);
  menu.querySelectorAll('.mobile-pages a').forEach((link,index)=>playMotion(link,[{opacity:0},{opacity:1}],{duration:120,delay:index*20,fill:'backwards'}));
  menu.querySelector('a')?.focus();
}
toggle?.addEventListener('click',()=>toggle.getAttribute('aria-expanded')==='true'?closeMenu(true):openMenu());
document.addEventListener('keydown',event=>{
  if(toggle?.getAttribute('aria-expanded')!=='true')return;
  if(event.key==='Escape'){event.preventDefault();closeMenu(true);return;}
  if(event.key==='Tab'){
    const items=[...header.querySelectorAll('a[href],button:not([disabled])')].filter(el=>el.getClientRects().length);
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
menu?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu(false,true)));
matchMedia('(min-width:1200px)').addEventListener('change',event=>{if(event.matches)closeMenu(false,true);});
window.addEventListener('pagehide',()=>closeMenu(false,true));

// Independent right-hand scrolling is only enabled when the entire profile fits.
const feed=$('[data-work-feed]'),profile=$('[data-profile]');
if(feed&&profile){
  const media=matchMedia('(min-width:1200px) and (min-height:760px)');
  let frame;
  const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
    // Reserve the header, page margins and the separate background control.
    const allowed=media.matches&&profile.getBoundingClientRect().height<=innerHeight-248;
    document.documentElement.toggleAttribute('data-split',allowed);
  });};
  new ResizeObserver(measure).observe(profile);media.addEventListener('change',measure);window.addEventListener('resize',measure,{passive:true});document.fonts.ready.then(measure);measure();
  const lang=document.body.dataset.language,key=`bk-feed-${lang}`;
  const save=()=>store.set(key,String(feed.scrollTop));
  window.addEventListener('pagehide',save);feed.querySelectorAll('[data-work-link]').forEach(a=>a.addEventListener('click',save));
  document.querySelectorAll('a[data-language]').forEach(a=>a.addEventListener('click',()=>{
    const rect=feed.getBoundingClientRect();
    if(rect.top>innerHeight)return;
    const item=[...feed.querySelectorAll('[data-work]')].find(card=>card.getBoundingClientRect().bottom>Math.max(rect.top,100)+20);
    if(item)store.set('bk-language-work',item.dataset.work);
  }));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const anchor=store.get('bk-language-work');
    if(anchor){
      store.remove('bk-language-work');
      const card=[...feed.children].find(el=>el.dataset.work===anchor);
      if(card){if(document.documentElement.hasAttribute('data-split'))feed.scrollTop=card.getBoundingClientRect().top-feed.getBoundingClientRect().top+feed.scrollTop;else if(anchor!==feed.firstElementChild?.dataset.work)card.scrollIntoView({block:'start',behavior:'instant'});}
    }else {
      const previous=document.referrer ? new URL(document.referrer) : null;
      const returning=previous?.origin===location.origin&&previous.pathname.includes('/portfolio/');
      if(returning||performance.getEntriesByType('navigation')[0]?.type==='back_forward')feed.scrollTop=Number(store.get(key)||0);
    }
  }));
}

// Passive position cue for both the desktop pane and natural mobile scrolling.
const position=$('[data-work-position]');
if(feed&&position){
  const cards=[...feed.querySelectorAll('[data-work]')];let positionFrame=0;
  const updatePosition=()=>{
    positionFrame=0;if(!cards.length)return;
    const split=document.documentElement.hasAttribute('data-split');
    const edge=split?feed.getBoundingClientRect().top+80:Math.min(180,innerHeight*.25);
    const atEnd=split?feed.scrollTop+feed.clientHeight>=feed.scrollHeight-2:cards.at(-1).getBoundingClientRect().bottom<=innerHeight+2;
    const index=atEnd?cards.length-1:cards.findIndex(card=>card.getBoundingClientRect().bottom>edge);
    const current=(index<0?cards.length-1:index)+1;
    position.querySelector('[data-work-index]').textContent=String(current).padStart(2,'0');
    position.setAttribute('aria-label',position.dataset.label.replace('{current}',String(current)).replace('{total}',String(cards.length)));
  };
  const queuePosition=()=>{if(!positionFrame)positionFrame=requestAnimationFrame(updatePosition)};
  feed.addEventListener('scroll',queuePosition,{passive:true});
  window.addEventListener('scroll',queuePosition,{passive:true});
  window.addEventListener('resize',queuePosition,{passive:true});
  window.addEventListener('pageshow',queuePosition);
  window.addEventListener('intro:end',queuePosition);
  new ResizeObserver(queuePosition).observe(feed);queuePosition();
}

const filters=[...document.querySelectorAll('[data-filter]')];
if(filters.length){
  const cards=[...document.querySelectorAll('.portfolio-grid [data-work]')],status=$('[data-filter-status]');
  const apply=(value,persist=true)=>{
    const category=['project','analysis'].includes(value)?value:'all';
    filters.forEach(button=>{const active=button.dataset.filter===category;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));});
    cards.forEach(card=>{card.hidden=category!=='all'&&card.dataset.category!==category;});
    status.textContent=`${cards.filter(card=>!card.hidden).length} ${status.dataset.label}`;
    if(persist){const url=new URL(location.href);if(category==='all')url.searchParams.delete('type');else url.searchParams.set('type',category);history.replaceState(null,'',url);}
    document.querySelectorAll('a[data-language]').forEach(link=>{const url=new URL(link.href);if(category!=='all')url.searchParams.set('type',category);else url.searchParams.delete('type');link.href=url;});
  };
  filters.forEach(button=>button.addEventListener('click',()=>apply(button.dataset.filter)));
  apply(new URL(location.href).searchParams.get('type'),false);
}

document.querySelectorAll('[data-copy-email]').forEach(button=>{
  button.hidden=false;
  const status=button.parentElement.querySelector('[data-copy-status]');
  const label=document.createElement('span');label.className='copy-email-label';label.textContent=button.textContent;button.replaceChildren(label);
  let timer,feedbackAnimation;
  const feedback=(text,success=false)=>{
    feedbackAnimation?.cancel();label.textContent=text;
    button.dataset.feedback=success?'success':'';
    feedbackAnimation=playMotion(label,[{opacity:0},{opacity:1}],{duration:160});
  };
  button.addEventListener('click',async()=>{
    clearTimeout(timer);
    try{
      await navigator.clipboard.writeText(button.dataset.copyEmail);
      feedback(button.dataset.copied,true);
      status.textContent=button.dataset.copied;
    }catch{
      const selection=getSelection(),range=document.createRange();
      range.selectNodeContents(button.parentElement.querySelector('.email-link'));
      selection?.removeAllRanges();selection?.addRange(range);
      feedback(button.dataset.failed);
      status.textContent=button.dataset.failed;
    }
    timer=setTimeout(()=>{feedback(button.dataset.label);status.textContent='';},2400);
  });
});

setupBackground();
setupCoverMotion();
setupPageMotion();
