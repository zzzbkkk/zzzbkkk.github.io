import { Header } from './Header.mjs';
import { escape, ui } from './shared.mjs';
import { readFileSync } from 'node:fs';
const introController=readFileSync(new URL('../client/intro-bootstrap.js',import.meta.url),'utf8');
const sceneController=readFileSync(new URL('../client/scene-bootstrap.js',import.meta.url),'utf8');
export function Layout({lang,page,slug,profile,title,description,body}) {
  const t=ui[lang];
  const home=page==='home';
  const missing=page==='404';
  const pagePath=[home?'':page,slug].filter(Boolean).join('/');
  const alternates=missing?'':[['zh','zh-CN'],['en','en']].map(([language,locale])=>`<link rel="alternate" hreflang="${locale}" href="/${language}/${pagePath?`${escape(pagePath)}/`:''}">`).join('');
  return `<!doctype html><html lang="${lang==='zh'?'zh-CN':'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#000000"><title>${escape(title)}</title><meta name="description" content="${escape(description)}">${missing?'<meta name="robots" content="noindex">':''}${alternates}<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:type" content="website"><meta property="og:locale" content="${lang==='zh'?'zh_CN':'en_US'}"><meta property="og:locale:alternate" content="${lang==='zh'?'en_US':'zh_CN'}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preload" href="/fonts/NON-Natural-Grotesk-Regular.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/cover-motion.css"><link rel="stylesheet" href="/motion.css">
  <script>${sceneController}</script><script>(function(){let seen=false;try{seen=sessionStorage.getItem('bk-entry')==='1';sessionStorage.setItem('bk-entry','1')}catch{}if(${home}&&!seen&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.dataset.intro='pending'}})();</script></head>
  <body data-page="${escape(page)}" data-language="${lang}"${slug?` data-slug="${escape(slug)}"`:''}>
  <script>addEventListener('pagereveal',function(event){if(event.viewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('route-transition');const clear=function(){document.documentElement.classList.remove('route-transition')};event.viewTransition.finished.then(clear,clear)}});</script>
  ${!missing?`<div class="page-art" aria-hidden="true"><img class="page-art-fallback" src="/art/dragonfly-ascii.svg" alt="" width="1440" height="900"><canvas class="background-canvas" aria-hidden="true"></canvas></div>`:''}
  <script>(function(){const art=document.querySelector('.page-art');if(!art)return;try{const saved=JSON.parse(sessionStorage.getItem('bk-scene-transfer')||'null');if(saved?.to===location.pathname&&(saved.scene||'dragonfly')==='dragonfly'&&Date.now()-saved.at<15000&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&typeof saved.frame==='string'&&saved.frame.startsWith('data:image/webp;')&&saved.frame.length<2000000){art.dataset.resumeFrame='true';art.querySelector('img').src=saved.frame}}catch{}})();</script>
  <div id="site">${Header({lang,page,slug,profile})}${body}${home?'':`<footer class="site-footer"><span>${t.footer}</span><a href="mailto:${escape(profile.email)}">${escape(profile.email)}</a></footer>`}</div>
  ${home?`<div class="intro-overlay" id="intro" hidden aria-label="${lang==='zh'?'进入个人网站':'Entering the portfolio'}"><p class="intro-name" aria-hidden="true">BOKAI ZHENG</p><button class="intro-skip" type="button">${t.skip}<span aria-hidden="true">↗</span></button></div><script>${introController}</script>`:''}
  <script type="module" src="/client/app.mjs"></script></body></html>`;
}

