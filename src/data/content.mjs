// Personal facts follow DESIGN.md §8 and the user-provided résumé.
// Résumé education and historical experience were checked against the original
// one-page PDF on 2026-10-03, including a rendered-page review.
// OiiOii and Drimo summaries are limited to the previously retrieved excerpts;
// the original retrieval was incomplete. Do not infer scores or final outcomes.

export const profile = {
  name: '郑柏锴',
  nameEn: 'Bokai Zheng',
  email: '18050160888@163.com',
  role: { zh: 'AI 产品经理', en: 'AI Product Manager' },
  bio: {
    zh: '参与 AI 内容生成与运营工具的需求设计、Prompt 策略和效果评测，具备视觉传达设计背景。',
    en: 'Experience in requirements, prompt strategies, and evaluation for AI content creation and operations tools, with a background in visual communication design.',
  },
  bioShort: {
    zh: '参与 AI 产品的需求设计、Prompt 策略与效果评测，具备视觉设计背景。',
    en: 'AI product requirements, prompt strategies, and evaluation, informed by a visual design background.',
  },
  github: null,
  woshipm: null,
  resume: {
    href: '/files/zheng-bokai-resume.pdf',
    language: 'zh',
    note: { zh: '中文 PDF · 现有版本', en: 'Chinese PDF · Existing version' },
  },
};

export const works = [
  {
    id: 'openclaw-operations',
    slug: 'openclaw-operations',
    order: 1,
    category: 'project',
    kind: 'experience',
    title: { zh: 'OpenClaw 智能运营工具', en: 'OpenClaw Operations Tool' },
    summary: {
      zh: '在福州伊隐文科技公司实习期间，参与数据查询、规则推送与周报生成的需求和流程设计，协同开发与测试推进迭代和验收。',
      en: 'During an internship at 福州伊隐文科技公司, contributed to requirements and workflow design for data queries, rule updates, and weekly reporting, working with development and testing teams on iteration and acceptance.',
    },
    cardSummary: {
      zh: '参与数据查询、规则推送与周报生成的需求和流程设计。',
      en: 'Requirements and workflow design for data queries, rule updates, and weekly reporting.',
    },
    type: { zh: '项目经历 · 工作概览', en: 'Project experience · Overview' },
    tags: {
      zh: ['需求设计', '运营工具', '迭代验收'],
      en: ['Requirements', 'Operations tools', 'Iteration & acceptance'],
    },
    outline: { zh: ['业务范围', '我的参与', '材料依据'], en: ['Scope', 'My contribution', 'Source'] },
    caseFacts: {
      zh: [
        { label: '时间', value: '2026.02 – 2026.05' },
        { label: '角色', value: 'AI 产品经理（实习）' },
        { label: '范围', value: '数据查询 · 规则推送 · 周报生成' },
      ],
      en: [
        { label: 'Period', value: 'Feb – May 2026' },
        { label: 'Role', value: 'AI Product Management Intern' },
        { label: 'Scope', value: 'Data queries · Rule updates · Weekly reporting' },
      ],
    },
    source: '/files/zheng-bokai-resume.pdf',
    sourceLabel: { zh: '查看简历中的经历', en: 'View experience in résumé' },
    sourceNote: {
      zh: '本页根据现有中文简历整理，展示已记录的参与范围。',
      en: 'This overview follows the available Chinese résumé and covers the contributions recorded there.',
    },
    sections: {
      zh: [
        {
          id: 'scope',
          title: '业务范围',
          paragraphs: ['OpenClaw 智能运营工具是我在福州伊隐文科技公司实习期间参与的工作内容，涉及数据查询、规则推送和周报生成三个方面。'],
        },
        {
          id: 'contribution',
          title: '我的参与',
          paragraphs: ['作为 AI 产品经理实习生，我参与相关需求和流程设计，并与开发、测试协同推进迭代与验收。'],
          bullets: [
            '需求与流程：围绕数据查询、规则推送和周报生成参与设计。',
            '迭代与验收：协同开发和测试跟进迭代、完成验收。',
          ],
        },
        {
          id: 'evidence',
          title: '材料依据',
          paragraphs: ['当前概览依据已提供的简历整理；具体决策、验证过程和项目结果将在相应材料更新后补充。'],
        },
      ],
      en: [
        {
          id: 'scope',
          title: 'Scope',
          paragraphs: ['I worked on the OpenClaw operations tool during my internship at 福州伊隐文科技公司. The recorded scope covers data queries, rule updates, and weekly reporting.'],
        },
        {
          id: 'contribution',
          title: 'My contribution',
          paragraphs: ['As an AI Product Management Intern, I contributed to requirements and workflow design, and worked with development and testing teams on iterations and acceptance.'],
          bullets: [
            'Requirements and workflows: contributed to design for data queries, rule updates, and weekly reporting.',
            'Iteration and acceptance: coordinated with development and testing teams through iterations and acceptance.',
          ],
        },
        {
          id: 'evidence',
          title: 'Source',
          paragraphs: ['This overview is based on the available résumé; decisions, validation, and outcomes will be added when supporting material is available.'],
        },
      ],
    },
  },
  {
    id: 'yesoul-t5',
    slug: 'yesoul-t5',
    order: 4,
    category: 'project',
    title: {
      zh: 'Yesoul 海外 App｜T5 跑步机功能适配 PRD',
      en: 'Yesoul Overseas App: T5 Treadmill Feature Adaptation',
    },
    summary: {
      zh: '这份需求文档聚焦 Yesoul 海外 App 与 T5 跑步机的功能适配，通过原始 PRD 查看具体需求。',
      en: 'A product requirements document focused on adapting T5 treadmill features within the Yesoul overseas app. Explore the requirements in the original PRD.',
    },
    cardSummary: {
      zh: '围绕海外 App 与 T5 跑步机的功能适配，呈现原始需求文档。',
      en: 'Product requirements for adapting T5 treadmill features to the overseas app.',
    },
    type: { zh: '项目资料 · PRD', en: 'Project document · PRD' },
    tags: {
      zh: ['海外 App', '跑步机', '功能适配'],
      en: ['Overseas app', 'Treadmill', 'Feature adaptation'],
    },
    source: 'https://wcnmz7llwe5p.feishu.cn/wiki/QxW7w5xoiiiGsPkjLoHcnLsEnFe',
    sourceNote: {
      zh: '原文为中文，可能需要登录飞书或具备文档访问权限。',
      en: 'The original is in Chinese and may require a Feishu sign-in or document access permission.',
    },
    sections: {
      zh: [
        {
          id: 'overview',
          title: '作品概述',
          paragraphs: ['这份 PRD 的主题是 Yesoul 海外 App 的 T5 跑步机功能适配，材料以产品需求文档的形式呈现。'],
        },
        {
          id: 'document',
          title: '原始材料',
          paragraphs: ['通过下方飞书入口阅读原始 PRD，查看具体需求与功能说明。'],
        },
      ],
      en: [
        {
          id: 'overview',
          title: 'Overview',
          paragraphs: ['This PRD concerns T5 treadmill feature adaptation for the Yesoul overseas app. The material is presented as a product requirements document.'],
        },
        {
          id: 'document',
          title: 'Original material',
          paragraphs: ['Open the original PRD on Feishu using the link below to read the requirements and feature descriptions.'],
        },
      ],
    },
  },
  {
    id: 'oiioii',
    slug: 'oiioii',
    order: 2,
    outline: { zh: ['测试场景', 'Agent 协作', '评估维度'], en: ['Test scenario', 'Agent coordination', 'Evaluation dimensions'] },
    category: 'analysis',
    title: { zh: 'OiiOii 产品拆解', en: 'OiiOii Product Teardown' },
    summary: {
      zh: '以一段 30 秒人物故事短片为场景，拆解多 Agent 创作流程，关注用户意图、角色一致性与编辑控制。',
      en: 'Using a 30-second character-driven story to examine a multi-agent creative workflow, with a focus on user intent, character consistency, and editing control.',
    },
    cardSummary: {
      zh: '用一段 30 秒故事，观察多 Agent 协作、角色一致性与编辑控制。',
      en: 'A 30-second story to examine agent coordination, character consistency, and editing control.',
    },
    type: { zh: '产品分析 · 产品拆解', en: 'Product analysis · Teardown' },
    tags: {
      zh: ['Agent 协作', '创作流程', '体验评估'],
      en: ['Agent coordination', 'Creative workflow', 'Experience evaluation'],
    },
    source: 'https://wcnmz7llwe5p.feishu.cn/wiki/FRFgwpB9Yix4bekCsvTcdzTMn6b',
    sourceNote: {
      zh: '以上为已记录研究内容的摘要，过程材料见中文原文；访问可能需要登录或文档权限。',
      en: 'This page summarizes recorded parts of the research. Process materials are in the Chinese original; access may require a sign-in or document permission.',
    },
    sections: {
      zh: [
        {
          id: 'scenario',
          title: '从一个具体创作任务出发',
          paragraphs: [
            '研究以一段 30 秒人物故事短片为测试场景：人物走进茶馆，与小二交谈，再转向窗外的集市。场景与镜头的变化，为观察叙事连续性和视觉一致性提供了具体路径。',
            '记录关注用户如何表达创作意图，以及系统如何组织信息确认、风格选择、剧本、角色、分镜和视频生成等环节。',
          ],
        },
        {
          id: 'workflow',
          title: '观察多 Agent 协作与人工介入',
          paragraphs: ['将艺术总监、编剧、角色设计和分镜等环节放进同一条创作流程，观察前一步的信息如何传递到后一步，也记录确认、重新生成与人工编辑的节点。'],
          bullets: [
            '用户意图：故事、人物和风格要求如何进入创作流程。',
            '协作衔接：剧本或角色设定发生变化后，后续步骤如何承接。',
            '编辑控制：用户在哪些步骤可以确认、修改或重新生成。',
          ],
        },
        {
          id: 'evaluation',
          title: '把体验拆成可观察的维度',
          paragraphs: ['分析分别观察最终交付与中间过程。以下是研究采用的评估维度，不是对产品的综合评分或最终成片结论。'],
          bullets: [
            '叙事与音画：故事是否连贯，画面和声音能否共同表达意图。',
            '视觉一致性：跨镜头的人物、场景和风格是否保持一致。',
            '人机共创：用户的修改是否被理解，编辑后流程能否继续。',
            '模型与资产：生成能力如何适配场景，角色等素材如何复用。',
          ],
        },
      ],
      en: [
        {
          id: 'scenario',
          title: 'Start with a concrete creative task',
          paragraphs: [
            'The research uses a 30-second character-driven story: a character enters a teahouse, talks with a waiter, and turns toward the market outside. Changes in setting and shots provide a concrete way to examine narrative continuity and visual consistency.',
            'The notes follow how a user expresses an idea and how the system organizes brief confirmation, style selection, scripts, characters, storyboards, and video generation.',
          ],
        },
        {
          id: 'workflow',
          title: 'Observe agent coordination and human input',
          paragraphs: ['Art direction, writing, character design, and storyboarding are considered within one workflow. The research follows information between stages and records points for confirmation, regeneration, and manual editing.'],
          bullets: [
            'User intent: how story, character, and style requirements enter the workflow.',
            'Coordination: how later stages respond when a script or character setting changes.',
            'Editing control: where users can confirm, revise, or regenerate content.',
          ],
        },
        {
          id: 'evaluation',
          title: 'Define observable dimensions of quality',
          paragraphs: ['The analysis considers both the delivered output and the process that produces it. These are evaluation dimensions, not an overall product score or a conclusion about the final film.'],
          bullets: [
            'Narrative and audiovisual coherence: whether the story, images, and sound convey the intended idea.',
            'Visual consistency: whether characters, settings, and style remain consistent across shots.',
            'Human–AI collaboration: whether edits are understood and the workflow can continue afterward.',
            'Models and assets: how generation capabilities suit the scenario and how assets can be reused.',
          ],
        },
      ],
    },
  },
  {
    id: 'drimo',
    slug: 'drimo',
    order: 3,
    outline: { zh: ['创作路径', '素材复用', '编辑控制'], en: ['Creative workflow', 'Asset reuse', 'Editing control'] },
    category: 'analysis',
    title: { zh: 'Drimo 竞品分析', en: 'Drimo Competitive Analysis' },
    summary: {
      zh: '从剧本、角色到分镜与视频制作，梳理 Drimo 的功能组织，观察创作流程、素材复用与局部编辑控制。',
      en: 'Tracing scripts, characters, storyboards, and video production to examine Drimo’s feature organization, asset reuse, and editing control.',
    },
    cardSummary: {
      zh: '沿剧本到视频的创作路径，分析素材复用与局部编辑控制。',
      en: 'Following the script-to-video workflow to examine asset reuse and editing control.',
    },
    type: { zh: '产品分析 · 竞品分析', en: 'Product analysis · Competitive research' },
    tags: {
      zh: ['工作流分析', '素材复用', '编辑控制'],
      en: ['Workflow analysis', 'Asset reuse', 'Editing control'],
    },
    source: 'https://wcnmz7llwe5p.feishu.cn/wiki/D3fWwAhwbik834kjE5Rc4X8vnCj',
    sourceNote: {
      zh: '以上为已记录研究内容的摘要，过程材料见中文原文；访问可能需要登录或文档权限。',
      en: 'This page summarizes recorded parts of the research. Process materials are in the Chinese original; access may require a sign-in or document permission.',
    },
    sections: {
      zh: [
        {
          id: 'journey',
          title: '沿着创作路径理解功能组织',
          paragraphs: ['研究从输入想法、粘贴文本或上传剧本开始，依次记录项目设置、角色设计、白板、场景与分镜，再进入视频制作的操作路径。关注前一步的产出如何成为下一步的输入。'],
          bullets: [
            '剧本与项目设置：组织故事内容、画面风格和角色信息。',
            '角色、白板与分镜：围绕场景组织人物、画面和镜头描述。',
            '视频制作：在时间线中处理画面、配音和字幕。',
          ],
        },
        {
          id: 'assets',
          title: '跟踪素材如何回到创作流程',
          paragraphs: [
            '文档记录角色图像在白板和后续分镜中的使用，以及角色、场景和道具等视觉资料的组织方式。',
            '素材复用的观察包括把生成图片应用到分镜，以及从历史记录中选择可以继续使用的图片或视频。',
          ],
        },
        {
          id: 'control',
          title: '把编辑控制落到具体操作',
          paragraphs: ['分析关注可编辑的创作流程，而不只看一次生成入口。已记录的操作包括剧本修改、场景与分镜排序、画面描述编辑、自然语言局部编辑，以及替换分镜素材。'],
          bullets: [
            '当前步骤是否清楚，用户能否理解下一步如何继续。',
            '修改能否在局部完成，已有素材是否便于回溯和复用。',
            '跨步骤的操作如何衔接，编辑内容如何回到项目。',
          ],
        },
      ],
      en: [
        {
          id: 'journey',
          title: 'Understand the features through the creative journey',
          paragraphs: ['The research follows a path from an idea, pasted text, or an uploaded script through project settings, character design, a visual board, scenes, storyboards, and video production. It examines how the output of one step becomes the input to the next.'],
          bullets: [
            'Scripts and project settings: organize the story, visual style, and character information.',
            'Characters, visual boards, and storyboards: connect scenes with characters, images, and shot descriptions.',
            'Video production: arrange images, voice, and subtitles on a timeline.',
          ],
        },
        {
          id: 'assets',
          title: 'Follow assets back into the workflow',
          paragraphs: [
            'The notes record how character images are used in visual boards and later storyboards, and how visual materials are organized around characters, settings, and props.',
            'Asset reuse is examined through actions such as applying generated images to shots and selecting images or videos from the generation history.',
          ],
        },
        {
          id: 'control',
          title: 'Look at editing control through specific actions',
          paragraphs: ['The analysis considers an editable workflow beyond a single generation step. Recorded actions include revising scripts, reordering scenes and shots, editing image descriptions, applying natural-language local edits, and replacing storyboard assets.'],
          bullets: [
            'Is the current step clear, and does the user understand how to continue?',
            'Can changes remain local, and can existing assets be found and reused?',
            'How do actions connect across steps, and how do edits return to the project?',
          ],
        },
      ],
    },
  },
].sort((a,b)=>a.order-b.order);

// Independent blog posts have not been supplied. Product analyses belong in works.
export const posts = [];

export const about = {
  intro: {
    zh: [
      '我是郑柏锴，曾参与 AI 内容生成与运营工具的用户研究、需求设计、Prompt 策略和效果评测。',
      '具备视觉传达设计背景，也有协同开发和测试推进迭代、验收的实习经历，目前求职方向为 AI 产品经理。',
    ],
    en: [
      'I’m Bokai Zheng. Through internships in AI content creation and operations tools, I contributed to user research, requirements, prompt strategies, and evaluation.',
      'I have a visual communication design background and experience working with development and testing teams on iterations and acceptance. I’m pursuing AI product management roles.',
    ],
  },
  education: [
    {
      school: { zh: '福建师范大学', en: 'Fujian Normal University' },
      degree: { zh: '视觉传达设计 · 本科', en: 'Bachelor’s degree in Visual Communication Design' },
      dates: '2022.09 - 2026.06',
    },
  ],
  experiences: [
    {
      company: '福州伊隐文科技公司',
      role: { zh: 'AI 产品经理（实习）', en: 'AI Product Management Intern' },
      dates: '2026.02 - 2026.05',
      summary: {
        zh: '围绕 OpenClaw 智能运营工具，参与数据查询、规则推送与周报生成的需求和流程设计，协同开发与测试完成迭代和验收。',
        en: 'Contributed to requirements and workflow design for data queries, rule updates, and weekly reporting in an OpenClaw operations tool, working with development and testing teams on iteration and acceptance.',
      },
    },
    {
      company: '浙江讯盟科技有限公司',
      role: { zh: 'AI 产品经理（实习）', en: 'AI Product Management Intern' },
      dates: '2025.06 - 2025.12',
      summary: {
        zh: '围绕 AI 漫剧生成工具开展用户研究和竞品分析，参与剧本、分镜与视频生成场景的 Prompt 策略、效果评测与适配测试。',
        en: 'Conducted user research and competitive analysis for an AI comic-video creation tool, contributing to prompt strategies, evaluation, and scenario testing for scripts, storyboards, and video generation.',
      },
    },
    {
      company: '福州桑垒设计有限公司',
      role: { zh: 'AIGC 设计师（实习）', en: 'AIGC Design Intern' },
      dates: '2024.12 - 2025.06',
      summary: {
        zh: '将 AI 绘图工具用于文创产品概念与视觉风格探索，围绕福州古建筑文化元素整理描述词，优化视觉生成流程与内容一致性。',
        en: 'Used AI image-generation tools for cultural-product concepts and visual exploration, developing descriptive prompts around Fuzhou’s historic architecture and refining generation workflows and consistency.',
      },
    },
  ],
  focus: {
    zh: ['AI 助手与 Agent 的用户任务和交互流程', '垂直场景中的需求拆解与产品体验', 'AI 内容生成的编辑控制与效果评估'],
    en: ['User tasks and interaction flows for AI assistants and agents', 'User needs and product experiences in domain-specific applications', 'Editing control and evaluation for AI content generation'],
  },
};

export const messages = {
  zh: {
    home:'首页', portfolio:'作品集', blog:'博客', about:'关于我', nav:'主导航', menu:'菜单', close:'关闭',
    language:'Switch to English', focus:'求职方向 · AI 应用产品', selected:'精选作品', viewPortfolio:'查看作品',
    resume:'查看简历', resumeNote:'中文 PDF · 现有版本', email:'邮箱', unavailable:'链接尚未提供',
    case:'查看 PRD 资料', experienceCase:'查看参与经历', analysis:'阅读分析', featuredPosition:'精选作品，第 {current} 项，共 {total} 项', skip:'跳过', skipContent:'跳至主要内容', all:'全部', projects:'项目案例', analyses:'产品分析',
    copyEmail:'复制邮箱', copied:'已复制', copyFailed:'已选中，请手动复制', motionPause:'暂停背景', motionResume:'恢复动效',
    sourceTop:'阅读飞书原文', prdSource:'阅读 PRD（飞书）', sourceAccess:'中文原文 · 可能需要登录', contents:'阅读导航',
    portfolioIntro:'从 AI 产品参与经历、创作工作流分析，到 App 与硬件的需求适配。材料包括现有简历与原始文档。',
    blogIntro:'关于产品、AI 与持续学习的记录。', emptyTitle:'文章整理中', emptyText:'可以先看看我的项目与产品分析。',
    aboutTitle:'从设计出发，走进产品。', background:'个人背景', education:'教育', experience:'相关经历', interests:'关注方向',
    contact:'保持联系', contactText:'期待交流 AI 应用产品经理的工作机会。', historyNote:'以下为现有简历中的历史记录，尚未包含后续经历更新。',
    source:'查看原文', sourceNote:'飞书文档 · 中文，访问可能需要登录', summaryNote:'本文为部分材料的分析摘要，完整内容见原文。',
    documentNote:'本页展示当前已提供的项目资料范围，具体需求以原始 PRD 为准。',
    back:'返回作品集', next:'继续阅读', missing:'没有找到这个页面', missingText:'这个地址可能已经更改，可以从首页继续浏览。',
    coverNote:'作品封面', filterLabel:'作品类型', results:'项作品', footer:'郑柏锴 · AI 产品经理',
  },
  en: {
    home:'Home', portfolio:'Portfolio', blog:'Blog', about:'About', nav:'Main navigation', menu:'Menu', close:'Close',
    language:'切换到中文', focus:'Focus · AI applications', selected:'Selected work', viewPortfolio:'View portfolio',
    resume:'View résumé', resumeNote:'Chinese PDF · current available version', email:'Email', unavailable:'Profile link not provided',
    case:'View PRD overview', experienceCase:'View my contribution', analysis:'Read analysis', featuredPosition:'Selected work, item {current} of {total}', skip:'Skip', skipContent:'Skip to main content', all:'All', projects:'Project cases', analyses:'Product analysis',
    copyEmail:'Copy email', copied:'Copied', copyFailed:'Selected; copy manually', motionPause:'Pause background', motionResume:'Resume motion',
    sourceTop:'Read the original on Feishu', prdSource:'Read PRD on Feishu', sourceAccess:'Chinese original · Sign-in may be required', contents:'On this page',
    portfolioIntro:'AI product contributions, creative workflow analysis, and app–hardware requirements, supported by the available résumé and original documents.',
    blogIntro:'Notes on products, AI, and ongoing learning.', emptyTitle:'Notes in the making', emptyText:'Explore my project documents and product analysis in the meantime.',
    aboutTitle:'A design background. A product perspective.', background:'Background', education:'Education', experience:'Relevant experience', interests:'Areas of focus',
    contact:'Keep in touch', contactText:'Open to conversations about AI application product management opportunities.', historyNote:'These are historical records from the available résumé. More recent experience is not included yet.',
    source:'Read the original', sourceNote:'Feishu document · Chinese; sign-in may be required', summaryNote:'This page summarizes part of the material. See the original for the full analysis.',
    documentNote:'This page presents the scope of the project material currently available. Please refer to the original PRD for detailed requirements.',
    back:'Back to portfolio', next:'Keep exploring', missing:'Page not found', missingText:'This address may have changed. Continue exploring from the homepage.',
    coverNote:'Work cover', filterLabel:'Work type', results:'works', footer:'Bokai Zheng · AI Product Manager',
  }
};
