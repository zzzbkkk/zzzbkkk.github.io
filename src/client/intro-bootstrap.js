/* Small independent controller: the 3-second deadline never waits for art or fonts. */
(() => {
  const html=document.documentElement, overlay=document.getElementById('intro'), site=document.getElementById('site');
  if(!html.hasAttribute('data-intro')) {overlay?.remove();return;}
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let timer, started=false, ended=false, startedAt=0;
  overlay.hidden=false;site.inert=true;
  const finish=(focus=false)=>{
    if(ended)return;ended=true;clearTimeout(timer);
    html.removeAttribute('data-intro');html.classList.remove('intro-reveal');site.inert=false;overlay.remove();
    window.__introEndedAt=performance.now();
    window.dispatchEvent(new Event('intro:end'));
    document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',onVisible);
    reduced.removeEventListener('change',onReduced);
    if(focus)document.getElementById('main')?.focus({preventScroll:true});
  };
  const onKey=e=>{if(e.key==='Escape'){e.preventDefault();finish(true);}};
  const onReduced=()=>{if(reduced.matches)finish();};
  const start=()=>{
    if(started||ended||document.hidden)return;
    started=true;
    requestAnimationFrame(()=>{
      if(ended)return;startedAt=performance.now();window.__introStartedAt=startedAt;
      overlay.classList.add('intro-running');
      // Reveal the prepared page during the final fade, not after it.
      setTimeout(()=>{if(!ended){html.dataset.intro='leaving';html.classList.add('intro-reveal');site.style.visibility='visible';window.dispatchEvent(new Event('intro:reveal'));}},2550);
      timer=setTimeout(()=>finish(),3000);window.dispatchEvent(new Event('intro:start'));
    });
  };
  const onVisible=()=>{if(document.hidden)return;if(started&&performance.now()-startedAt>=3000)finish();else start();};
  overlay.querySelector('button').addEventListener('click',event=>finish(event.detail===0));
  document.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',onVisible);
  reduced.addEventListener('change',onReduced);window.addEventListener('pagehide',()=>finish(),{once:true});
  start();
})();
