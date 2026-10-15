import { escape, text, route, arrow, ui } from './shared.mjs';
import { WorkCard, WorkCover } from './WorkCard.mjs';
function MotionControl(lang) {
  const t=ui[lang];
  return `<button type="button" class="motion-toggle" data-motion-toggle data-pause="${t.motionPause}" data-resume="${t.motionResume}" hidden>${t.motionPause}</button>`;
}
export function Resume({profile,lang}) {
  return profile.resume?.href ? `<div class="resume-action"><a class="button button-secondary" href="${escape(profile.resume.href)}" target="_blank" rel="noopener noreferrer">${ui[lang].resume}${arrow('external')}</a><span class="resume-note">${text(profile.resume.note,lang)||ui[lang].resumeNote}</span></div>` : '';
}
function Email({profile,lang,large=false}) {
  const t=ui[lang];
  return `<div class="email-row${large?' email-row-large':''}"><a href="mailto:${escape(profile.email)}" class="email-link">${escape(profile.email)}</a><button class="copy-email" type="button" data-copy-email="${escape(profile.email)}" data-label="${t.copyEmail}" data-copied="${t.copied}" data-failed="${t.copyFailed}" hidden>${t.copyEmail}</button><span class="sr-only" role="status" data-copy-status></span></div>`;
}
export function Home({lang,profile,works}) {
  const t=ui[lang];
  return `<main id="main" class="home-layout" tabindex="-1">
    <section class="profile-panel" aria-labelledby="profile-name"><div class="profile-content" data-profile>
      <p class="profile-focus">${t.focus}</p>
      <div class="profile-name"><h1 id="profile-name">${escape(lang==='zh'?profile.name:profile.nameEn)}</h1><p class="name-secondary">${escape(lang==='zh'?profile.nameEn:profile.name)}</p></div>
      <p class="profile-role">${text(profile.role,lang)}</p><p class="profile-bio"><span class="bio-full">${text(profile.bio,lang)}</span><span class="bio-short">${text(profile.bioShort||profile.bio,lang)}</span></p>
      <div class="profile-contact">${Email({profile,lang})}</div>
      <div class="profile-actions"><a class="button button-primary" href="${route(lang,'portfolio')}">${t.viewPortfolio}${arrow()}</a>${Resume({profile,lang})}</div>
    </div><div class="background-tools">${MotionControl(lang)}</div></section>
    <section class="featured-panel"><div class="featured-heading"><h2 id="featured-title">${t.selected}</h2><span class="heading-rule" aria-hidden="true"></span><span class="work-position" role="img" data-work-position data-total="${works.length}" data-label="${escape(t.featuredPosition)}" aria-label="${escape(t.featuredPosition.replace('{current}','1').replace('{total}',String(works.length)))}"><span data-work-index>01</span><span aria-hidden="true"> / ${String(works.length).padStart(2,'0')}</span></span></div>
      <div class="work-feed" data-work-feed tabindex="0" role="region" aria-labelledby="featured-title">${works.map(work=>WorkCard(work,lang,3,{compact:true})).join('')}</div>
    </section>
  </main>`;
}
export function Portfolio({lang,works}) {
  const t=ui[lang];
  return `<main id="main" class="page-shell" tabindex="-1"><div class="page-heading"><div class="page-heading-line"><h1>${t.portfolio}</h1>${MotionControl(lang)}</div><p>${t.portfolioIntro}</p></div>
    <form class="filter-bar" aria-label="${t.filterLabel}"><button type="button" class="filter-button selected" data-filter="all" aria-pressed="true">${t.all}<span>${works.length}</span></button><button type="button" class="filter-button" data-filter="project" aria-pressed="false">${t.projects}<span>${works.filter(w=>w.category==='project').length}</span></button><button type="button" class="filter-button" data-filter="analysis" aria-pressed="false">${t.analyses}<span>${works.filter(w=>w.category==='analysis').length}</span></button></form>
    <p class="sr-only" role="status" data-filter-status data-label="${t.results}"></p><div class="portfolio-grid">${works.map(work=>WorkCard(work,lang,2)).join('')}</div></main>`;
}
export function Blog({lang,posts,works}) {
  const t=ui[lang];
  const research=works.filter(work=>work.category==='analysis');
  return `<main id="main" class="page-shell narrow-page" tabindex="-1"><div class="page-heading"><div class="page-heading-line"><h1>${t.blog}</h1>${MotionControl(lang)}</div><p>${t.blogIntro}</p></div>${posts.length ? posts.map(p=>`<article><h2>${text(p.title,lang)}</h2></article>`).join('') : `<section class="research-reading" aria-labelledby="research-title"><p class="reading-note">${lang==='zh'?'独立文章整理中，先从已有的产品研究开始。':'Independent posts are in preparation. Start with these product studies.'}</p><h2 id="research-title">${lang==='zh'?'产品研究':'Product studies'}</h2><div class="research-list">${research.map((work,index)=>`<article class="research-item"><span class="research-index" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><div><p class="work-type">${text(work.type,lang)}</p><h3><a href="${route(lang,`portfolio/${work.slug}`)}">${text(work.title,lang)}</a></h3><p>${text(work.cardSummary||work.summary,lang)}</p><a class="text-link" href="${route(lang,`portfolio/${work.slug}`)}">${t.analysis}${arrow()}</a></div></article>`).join('')}</div></section>`}</main>`;
}
export function About({lang,profile,about}) {
  const t=ui[lang];
  return `<main id="main" class="page-shell narrow-page about-page" tabindex="-1"><div class="page-heading"><div class="about-heading-meta"><p class="page-kicker">${t.about}</p>${MotionControl(lang)}</div><h1>${t.aboutTitle}</h1></div>
    <section class="about-intro">${(about.intro?.[lang]||[]).map(p=>`<p>${escape(p)}</p>`).join('')}</section>
    <section class="about-section" id="experience"><h2>${t.experience}</h2><p class="section-note">${t.historyNote}</p><div class="experience-list">${(about.experiences||[]).map((item,index)=>`<article class="experience-item"><p class="item-date">${escape(item.dates)}</p><div><h3>${text(item.role,lang)}</h3><p class="company">${text(item.company,lang)}</p><p>${text(item.summary,lang)}</p>${index===0?`<a class="text-link experience-link" href="${route(lang,'portfolio/openclaw-operations')}">${lang==='zh'?'查看我的参与范围':'Explore my contribution'}${arrow()}</a>`:''}</div></article>`).join('')}</div></section>
    <section class="about-section"><h2>${t.interests}</h2><ul class="focus-list">${(about.focus?.[lang]||[]).map(item=>`<li>${escape(item)}</li>`).join('')}</ul></section>
    <section class="about-section"><h2>${t.education}</h2>${(about.education||[]).map(item=>`<div class="education-item"><p class="item-date">${escape(item.dates)}</p><h3>${text(item.school,lang)}</h3><p>${text(item.degree,lang)}</p></div>`).join('')}</section>
    <section class="about-section contact-section"><h2>${t.contact}</h2><p>${t.contactText}</p>${Email({profile,lang,large:true})}${Resume({profile,lang})}</section></main>`;
}
export function Detail({lang,work,works}) {
  const t=ui[lang];
  const experience=work.kind==='experience';
  const sections=work.category==='project'&&!experience?[]:(work.sections?.[lang]||[]);
  const sourceLabel=experience?text(work.sourceLabel,lang):work.category==='project'?t.prdSource:t.sourceTop;
  const sourceAccess=experience?(lang==='zh'?'中文 PDF · 已提供的简历':'Chinese PDF · Supplied résumé'):t.sourceAccess;
  const scopeNote=experience?text(work.sourceNote,lang):work.category==='project'?t.documentNote:t.summaryNote;
  const next=works[(works.findIndex(w=>w.slug===work.slug)+1)%works.length];
  return `<main id="main" class="page-shell detail-page" tabindex="-1"><div class="detail-topline"><a href="${route(lang,'portfolio')}" class="back-link">${arrow('back')}${t.back}</a>${MotionControl(lang)}</div><header class="detail-heading"><p class="work-type">${text(work.type,lang)}</p><h1>${text(work.title,lang)}</h1><p class="detail-summary">${text(work.summary,lang)}</p><div class="detail-source"><a class="button button-primary" href="${escape(work.source)}" target="_blank" rel="noopener noreferrer">${sourceLabel}${arrow('external')}</a><p>${sourceAccess}</p></div></header>
    ${experience&&work.caseFacts?.[lang]?.length?`<dl class="case-facts">${work.caseFacts[lang].map(fact=>`<div><dt>${escape(fact.label)}</dt><dd>${escape(fact.value)}</dd></div>`).join('')}</dl>`:''}
    ${WorkCover(work,lang)}<div class="article-content"><p class="source-scope">${scopeNote}</p>
    ${sections.length?`<nav class="article-outline" aria-label="${t.contents}"><p>${t.contents}</p><ol>${sections.map((section,index)=>`<li><a href="#${escape(section.id)}">${escape(work.outline?.[lang]?.[index]||section.title)}${arrow()}</a></li>`).join('')}</ol></nav>`:''}
    ${sections.map(section=>`<section class="article-section" id="${escape(section.id)}"><h2>${escape(section.title)}</h2>${(section.paragraphs||[]).map(p=>`<p>${escape(p)}</p>`).join('')}${section.bullets?.length ? `<ul>${section.bullets.map(b=>`<li>${escape(b)}</li>`).join('')}</ul>`:''}</section>`).join('')}
    ${sections.length?`<div class="source-box"><a class="text-link" href="${escape(work.source)}" target="_blank" rel="noopener noreferrer">${experience?sourceLabel:t.source}${arrow('external')}</a><p>${text(work.sourceNote,lang)||t.sourceNote}</p></div>`:''}
    <div class="next-work"><p>${t.next}</p><a class="text-link" href="${route(lang,`portfolio/${next.slug}`)}">${text(next.title,lang)}${arrow()}</a></div></div></main>`;
}
export function NotFound({lang}) { const t=ui[lang]; return `<main id="main" class="page-shell narrow-page" tabindex="-1"><div class="page-heading"><p class="page-kicker">404</p><h1>${t.missing}</h1><p>${t.missingText}</p></div><a class="button button-primary" href="${route(lang)}">${t.home}${arrow()}</a></main>`; }
