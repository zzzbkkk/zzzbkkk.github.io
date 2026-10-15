import { mkdir, writeFile, cp, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { profile, works, posts, about } from '../src/data/content.mjs';
import { Layout } from '../src/components/Layout.mjs';
import { Home, Portfolio, Blog, About, Detail, NotFound } from '../src/components/Pages.mjs';
import { ui } from '../src/components/shared.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
// Delete only this generated output directory, never a linked or computed parent.
if(path.relative(root,dist)!=='dist'||(await lstat(dist).catch(()=>null))?.isSymbolicLink())throw new Error('Unsafe output directory');
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(path.join(root,'public'),dist,{recursive:true});
await cp(path.join(root,'src/client'),path.join(dist,'client'),{recursive:true});
await mkdir(path.join(dist,'visuals'),{recursive:true});
for (const file of ['interactive-dragonfly.js','dragonfly-shaders.js']) await cp(path.join(root,'src/visuals',file),path.join(dist,'visuals',file));
await cp(path.join(root,'src/styles.css'),path.join(dist,'styles.css'));
for(const file of ['motion.css','cover-motion.css'])await cp(path.join(root,'src',file),path.join(dist,file));
const pages=[];
const descriptions={
  zh:{
    home:profile.bio.zh,
    portfolio:'郑柏锴的项目与产品分析：OpenClaw 智能运营工具参与经历、OiiOii 产品拆解、Drimo 竞品分析与 Yesoul T5 功能适配 PRD。',
    blog:'郑柏锴关于产品、AI 与持续学习的记录。独立文章正在整理，可先阅读项目与产品分析。',
    about:'了解郑柏锴的视觉传达设计背景、教育与实习经历，以及在 AI 内容生成和运营工具中的用户研究、需求设计与效果评测工作。',
  },
  en:{
    home:profile.bio.en,
    portfolio:'Projects and product analysis by Bokai Zheng: OpenClaw operations tool experience, an OiiOii teardown, Drimo research, and the Yesoul T5 PRD.',
    blog:'Notes on products, AI, and learning by Bokai Zheng. Independent articles are in preparation; explore project documents and product analysis in the meantime.',
    about:'Explore Bokai Zheng’s design background, education, and internships in user research, requirements, and evaluation for AI content and operations tools.',
  },
};
for(const lang of ['zh','en']) {
  for(const [page,render] of Object.entries({home:Home,portfolio:Portfolio,blog:Blog,about:About})) {
    const route=`/${lang}/${page==='home'?'':`${page}/`}`;
    const title=page==='home'?`${lang==='zh'?profile.name:profile.nameEn} · ${profile.role[lang]}`:`${ui[lang][page]} · Bokai Zheng`;
    const html=Layout({lang,page,profile,title,description:descriptions[lang][page],body:render({lang,profile,works,posts,about})});
    const target=path.join(dist,route,'index.html');await mkdir(path.dirname(target),{recursive:true});await writeFile(target,html);pages.push(route);
  }
  for(const work of works) {
    if(!/^[a-z0-9-]+$/.test(work.slug)) throw new Error('Invalid work slug');
    const route=`/${lang}/portfolio/${work.slug}/`;
    const target=path.join(dist,route,'index.html');await mkdir(path.dirname(target),{recursive:true});
    await writeFile(target,Layout({lang,page:'portfolio',slug:work.slug,profile,title:`${work.title[lang]} · Bokai Zheng`,description:work.summary[lang],body:Detail({lang,work,works})}));pages.push(route);
  }
  const error=Layout({lang,page:'404',profile,title:`${ui[lang].missing} · Bokai Zheng`,description:ui[lang].missingText,body:NotFound({lang})});
  await writeFile(path.join(dist,lang,'404.html'),error);
}
await cp(path.join(dist,'zh/index.html'),path.join(dist,'index.html'));
await cp(path.join(dist,'zh/404.html'),path.join(dist,'404.html'));
await writeFile(path.join(root,'build-manifest.json'),JSON.stringify({pages,works:works.length,languages:['zh','en']},null,2));
console.log(`Built ${pages.length} bilingual pages, ${works.length} works. Static HTML, no runtime dependencies.`);
