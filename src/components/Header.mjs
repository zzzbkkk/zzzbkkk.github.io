import { escape, arrow, route, ui } from './shared.mjs';
export function Header({lang, page, slug, profile}) {
  const t = ui[lang];
  const other = lang === 'zh' ? 'en' : 'zh';
  const alternate = route(other, page==='404'?'':[page === 'home' ? '' : page, slug].filter(Boolean).join('/'));
  const links = ['home','portfolio','blog','about'].map(key => `<a class="nav-link${page === key ? ' current' : ''}" href="${route(lang,key === 'home' ? '' : key)}"${page === key ? ' aria-current="page"' : ''}>${page===key?'<span class="nav-current-bg" aria-hidden="true"></span>':''}${t[key]}</a>`).join('');
  const socials = [['GitHub',profile.github],['人人都是产品经理',profile.woshipm]].filter(([,url])=>url).map(([label,url]) => `<a class="social-link" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}${arrow('external')}</a>`).join('');
  return `<a class="skip-link" href="#main">${t.skipContent}</a>
  <header class="site-header" data-header>
    <nav class="desktop-navigation" aria-label="${t.nav}"><div class="nav-pages">${links}</div>${socials?`<div class="nav-socials">${socials}</div>`:''}</nav>
    <a class="identity-link" href="${route(lang)}" aria-label="Bokai Zheng · ${t.home}">Bokai Zheng</a>
    <a class="language-link" data-language href="${alternate}" lang="${other}" aria-label="${t.language}">${other === 'en' ? 'EN' : '中文'}</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle data-open-label="${t.menu}" data-close-label="${t.close}">${t.menu}</button>
    <nav class="mobile-menu" id="mobile-menu" aria-label="${t.nav}" hidden><div class="mobile-pages">${links}</div>${socials?`<div class="mobile-socials">${socials}</div>`:''}</nav>
  </header><noscript><nav class="noscript-nav" aria-label="${t.nav}">${links}</nav></noscript>`;
}
