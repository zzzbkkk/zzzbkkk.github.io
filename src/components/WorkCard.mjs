import { escape, text, arrow, route, ui } from './shared.mjs';
export function WorkCover(work,lang) {
  // Research diagrams summarize the recorded material; they are not product UI.
  const copy=lang==='zh'?{
    diagram:'内容示意',workflow:'多 Agent 创作流程',steps:['创意输入','剧本与角色','分镜','视频生成'],
    workflowNote:'30 秒故事任务 · 观察确认、编辑与再生成',reuse:'素材复用与编辑',
    history:'历史素材',editing:'图片编辑',board:'分镜',production:'视频制作',reuseNote:'从素材选择，到分镜应用与视频制作',
    adaptation:'App 与硬件的适配范围',app:'Yesoul 海外 App',device:'T5 跑步机',link:'功能适配',prdNote:'PRD · 具体需求见原始文档',
  }:{
    diagram:'Content diagram',workflow:'Multi-agent creative workflow',steps:['Brief','Script & cast','Storyboard','Video'],
    workflowNote:'30s story task · Confirm, edit, regenerate',reuse:'Asset reuse & editing',
    history:'Asset history',editing:'Image editing',board:'Storyboard',production:'Video production',reuseNote:'Select assets, apply to shots, produce video',
    adaptation:'App–hardware scope',app:'Yesoul overseas app',device:'T5 treadmill',link:'Feature adaptation',prdNote:'PRD · Requirements in the source document',
  };
  const head=title=>`<div class="preview-heading"><span>${escape(title)}</span><span class="diagram-label">${copy.diagram}</span></div>`;
  const footer=label=>`<p class="preview-caption">${escape(label)}</p>`;
  const visuals={
    'openclaw-operations':head(lang==='zh'?'智能运营工具 · 参与范围':'Operations tool · Contribution scope')+`<div class="preview-operations">${(lang==='zh'?['数据查询','规则推送','周报生成']:['Data queries','Rule updates','Weekly reports']).map((label,index)=>`<div data-diagram-stage style="--stage-delay:${index*140}ms"><span class="operations-code">${['QUERY','RULE','REPORT'][index]}</span><span>${escape(label)}</span></div>`).join('')}</div>`+footer(lang==='zh'?'需求与流程设计 · 开发、测试协作':'Requirements & workflows · Development and testing collaboration'),
    oiioii:head(copy.workflow)+`<ol class="preview-flow">${copy.steps.map((step,index)=>`<li data-diagram-stage style="--stage-delay:${index*140}ms"><span class="flow-index diagram-node">${String(index+1).padStart(2,'0')}</span><span class="flow-label">${escape(step)}</span></li>`).join('')}</ol>`+footer(copy.workflowNote),
    drimo:head(copy.reuse)+`<div class="preview-reuse"><div class="reuse-source-group"><div class="reuse-inputs" data-diagram-stage style="--stage-delay:0ms"><span class="diagram-node">01</span><div class="reuse-source-labels"><span>${copy.history}</span><span>${copy.editing}</span></div></div></div><span class="diagram-arrow reuse-group-link" style="--stage-delay:140ms"></span><div class="reuse-process-group"><div class="reuse-board" data-diagram-stage style="--stage-delay:280ms"><span class="diagram-node">02</span><span>${copy.board}</span></div><span class="diagram-arrow" style="--stage-delay:420ms"></span><div class="reuse-output" data-diagram-stage style="--stage-delay:560ms"><span class="diagram-node">03</span><span>${copy.production}</span></div></div></div>`+footer(copy.reuseNote),
    'yesoul-t5':head(copy.adaptation)+`<div class="preview-adaptation"><div class="adapt-endpoint" data-diagram-stage><span class="endpoint-symbol diagram-node">APP</span><span>${copy.app}</span></div><div class="adapt-connection"><span>${copy.link}</span><i></i></div><div class="adapt-endpoint" data-diagram-stage><span class="endpoint-symbol diagram-node">T5</span><span>${copy.device}</span></div></div>`+footer(copy.prdNote),
  };
  const descriptions={
    'openclaw-operations':lang==='zh'?'参与范围示意：数据查询、规则推送、周报生成的需求与流程设计。':'Contribution scope: requirements and workflow design for data queries, rule updates, and weekly reporting.',
    oiioii:`${copy.diagram}：${copy.steps.join(' → ')}。${copy.workflowNote}`,
    drimo:`${copy.diagram}：${copy.history} / ${copy.editing} → ${copy.board} → ${copy.production}`,
    'yesoul-t5':`${copy.diagram}：${copy.app} — ${copy.link} — ${copy.device}。${copy.prdNote}`,
  };
  return `<div class="work-cover work-cover-${escape(work.slug)}" data-cover-motion="${escape(work.slug)}" role="img" aria-label="${text(work.title,lang)} · ${escape(descriptions[work.slug]||ui[lang].coverNote)}"><div class="cover-art" aria-hidden="true">${visuals[work.slug]||`<span class="cover-word">${text(work.title,lang)}</span>`}</div></div>`;
}
export function WorkCard(work,lang,level=3,{compact=false}={}) {
  const t=ui[lang];
  const heading=level===2?'h2':'h3';
  const href=route(lang,`portfolio/${work.slug}`);
  return `<article class="work-card${compact?' work-card-compact':''}" data-work="${escape(work.slug)}" data-category="${escape(work.category)}">
    ${WorkCover(work,lang)}
    <div class="work-card-body"><p class="work-type">${text(work.type,lang)}</p>
    <${heading}><a href="${href}" data-work-link>${text(work.title,lang)}</a></${heading}>
    <p class="work-summary">${text(compact&&work.cardSummary?work.cardSummary:work.summary,lang)}</p>
    <ul class="work-tags" aria-label="${lang==='zh'?'主题':'Topics'}">${(work.tags?.[lang]||[]).slice(0,3).map(tag=>`<li>${escape(tag)}</li>`).join('')}</ul>
    <div class="work-card-action"><a class="text-link" href="${href}" data-work-link>${work.kind==='experience'?t.experienceCase:work.category === 'project' ? t.case : t.analysis}${arrow()}</a></div></div>
  </article>`;
}
