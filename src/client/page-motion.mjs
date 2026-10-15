// Progressive motion: content is always visible without this module or JS.
export const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const compact=matchMedia('(max-width:767px), (pointer:coarse)');
const active=new Set();
export function playMotion(element,keyframes,options={}){
  if(!element||reducedMotion.matches||!element.animate)return null;
  const animation=element.animate(keyframes,{duration:180,easing:'cubic-bezier(.2,.7,.2,1)',...options});
  active.add(animation);
  animation.finished.catch(()=>{}).finally(()=>active.delete(animation));
  return animation;
}
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){for(const animation of active)animation.cancel();active.clear();}});

export function setupPageMotion(){
  const html=document.documentElement,main=document.querySelector('#main');
  // A browser-native cross-document transition handles navigations when supported.
  if(!html.hasAttribute('data-intro')&&!document.documentElement.classList.contains('route-transition')){
    playMotion(main,[{opacity:0},{opacity:1}],{duration:180});
  }
  let seen;
  try{const stored=JSON.parse(sessionStorage.getItem('bk-seen-work')||'[]');seen=new Set(Array.isArray(stored)?stored:[])}catch{seen=new Set()}
  const remember=card=>{
    seen.add(card.dataset.work);
    try{sessionStorage.setItem('bk-seen-work',JSON.stringify([...seen]))}catch{}
    card.dataset.revealed='true';
  };
  let observer;
  const startReveals=()=>{
    if(!('IntersectionObserver' in window))return;
    observer?.disconnect();
    observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting||entry.target.hidden)continue;
        const card=entry.target;
        if(!seen.has(card.dataset.work)){
          remember(card);
          playMotion(card,[{opacity:0,translate:compact.matches?'0 0':'0 12px'},{opacity:1,translate:'0 0'}],{duration:220});
        }else card.dataset.revealed='true';
        observer.unobserve(card);
      }
    },{threshold:0,rootMargin:'0px 0px -12px 0px'});
    document.querySelectorAll('.work-card').forEach(card=>observer.observe(card));
  };
  window.addEventListener('pagehide',()=>{observer?.disconnect();for(const animation of active)animation.cancel();});
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    try{const stored=JSON.parse(sessionStorage.getItem('bk-seen-work')||'[]');if(Array.isArray(stored))stored.forEach(id=>seen.add(id))}catch{}
    startReveals();
  });
  // Scroll restoration runs first. The introductory card has its own staged reveal.
  const schedule=()=>requestAnimationFrame(()=>requestAnimationFrame(startReveals));
  if(html.hasAttribute('data-intro')){
    window.addEventListener('intro:reveal',()=>{
      const first=document.querySelector('.work-card');if(first)remember(first);
    },{once:true});
    window.addEventListener('intro:end',schedule,{once:true});
  }else schedule();

  // Keep native hash/history semantics, then acknowledge arrival at the section.
  let arrivalTimer,scrollCleanup;
  document.querySelectorAll('.article-outline a').forEach(link=>link.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const section=document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if(!section)return;
    clearTimeout(arrivalTimer);scrollCleanup?.();
    const acknowledge=()=>{
      clearTimeout(arrivalTimer);scrollCleanup?.();
      document.querySelectorAll('.article-section.arrived').forEach(el=>el.classList.remove('arrived'));
      section.classList.add('arrived');
      const title=section.querySelector('h2');
      if(title){title.tabIndex=-1;title.focus({preventScroll:true});}
      setTimeout(()=>section.classList.remove('arrived'),700);
    };
    const settled=()=>{clearTimeout(arrivalTimer);arrivalTimer=setTimeout(acknowledge,100)};
    document.addEventListener('scroll',settled,{passive:true});
    scrollCleanup=()=>{document.removeEventListener('scroll',settled);scrollCleanup=null};
    arrivalTimer=setTimeout(acknowledge,reducedMotion.matches?0:180);
  }));
}
