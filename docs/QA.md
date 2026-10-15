# 页面验证记录

最近验证：2026-10-15。线上首发使用 Chrome 验证；历史本地验证使用 Microsoft Edge / Chromium，本地预览端口 4323。

## GitHub Pages 首次发布：2026-10-15

- 正式网址：<https://zzzbkkk.github.io/>；仓库：<https://github.com/zzzbkkk/zzzbkkk.github.io>。HTTPS 已启用，`main` 推送通过 GitHub Actions 自动构建、检查并发布。首次成功部署记录：<https://github.com/zzzbkkk/zzzbkkk.github.io/actions/runs/38723534207>，源码提交 `6ed075f`。
- 本地与 GitHub Actions 构建检查均通过：16 个双语页面、4 项作品、510 个链接/资源引用、11 个 CSS/JS 模块。上线未修改页面视觉与正文。
- 线上 HTTP 验收覆盖 40 个请求：16 个内容页、根首页、404 文件均返回 200，两条未知中英文路径返回 404；20 项 JS、CSS、模型、WASM、字体、简历等关键资源状态及 MIME 正确。GitHub Pages 的根路径显示中文首页，未知英文路径沿用根中文 404。
- 简历为 8,580,008 字节，SHA-256 与本地一致；CSS 仅由 Git 统一 CRLF/LF 换行，内容一致。`.gitattributes` 明确 PDF、字体和模型等二进制类型，防止行尾转换破坏资源。
- Chrome 实际打开正式网址后入场正常结束，只有一个背景 Canvas，实时蜻蜓已启用且无横向溢出；作品集导航和中英文切换正常。线上截图留在本地 `docs/qa/github-pages-home.jpg`。本轮为部署验收，没有重新进行完整动效、真机或跨地区网络测试。
- 源码提交排除了历史备份、参考截图、QA 图片、构建产物和本地环境文件；Pages 只发布 `dist/`，不运行 `server.mjs`，本地服务器的缓存和 CSP 响应头不作为线上配置。

## 当前版本：v3.0.2 三秒入场

- 构建与静态检查通过：16 个双语内容页、4 项作品、510 个链接/资源引用、11 个 CSS/JS 模块；已目视检查桌面翅缘、姓名画面及手机姓名画面。
- 入场总时长改为 3000ms，各阶段按 1.5 倍放慢：0–450ms 部分翅缘，450–1350ms 主体与全翼渐显，1350–1740ms 姓名淡入，1740–2370ms 保持，2370–2550ms 姓名退出，2550–3000ms 首页分批出现。蜻蜓保持居中至片头结束，普通页面视觉与内容不变。
- 入场专项 26 项通过，0 个未捕获异常，见 `qa/intro-sequence-results.json`。1440px 中文、390px 中文和 320px 英文实测总时长为 3.000–3.010 秒；阶段顺序、姓名时序、中央构图、备用图隐藏及首页恢复通过。
- 跳过、Escape、同会话不重播、减少动态效果、慢加载按时结束、迟到模型直接使用首页构图及普通内容页背景均通过。本轮未重跑完整通用页面、背景、动效或 axe 回归；验证范围为本机 Chromium 及模拟手机视口。
- 三秒录屏动图与关键帧更新于 `qa/intro-sequence-preview.gif`、`qa/intro-recorded-edges.png`、`qa/intro-recorded-body.png`、`qa/intro-recorded-name.png`；动图末帧额外停留便于查看，循环仅用于预览。共用结果文件以本轮输出为准，以下保留历史验证记录。

## v3.0.1 入场顺序调整（历史）

- 仅调整入场顺序；胶囊导航、四张 HTML 内容示意图、卡片、姓名字号及正文沿用恢复后的 v3.0。0–300ms 先显部分翅缘，300–900ms 渐显完整蜻蜓，900–1160ms 姓名淡入，1580ms 起退场，1700–2000ms 露出首页。构图保持 `x: 0 / zoom: 1` 到实际入场结束后才交接。
- 构建和静态检查通过：16 个双语内容页、4 项作品、510 个链接/资源引用、11 个 CSS/JS 模块。原始 shader 文件不变，派生材质与现有 ASCII pass 控制短暂的翅缘揭示；普通页面进度为 1，材质恢复原效果。无新增渲染 pass。
- 本轮入场专项 26 项通过，0 个未捕获异常，见 `qa/intro-sequence-results.json`，复现脚本为 `scripts/intro-check.mjs`。1440px 中文、390px 中文、320px 英文依次经过 wing-edges / body-reveal / complete；姓名在 900ms 前隐藏、1200ms 后清晰，三种视口实测总时长 2.002–2.014 秒。入场中蜻蜓保持居中，无横向溢出。
- 已目视检查桌面分阶段录屏和中英手机主体/姓名画面。实时模型就绪后静态备用图被隐藏，避免全身备用图盖住翅缘阶段；片头 Canvas 不叠加额外淡入。静态降级使用整体渐显，未声称可复现精确几何翅缘。
- 跳过立即显示完整材质与可用首页，Escape 恢复主内容焦点，同会话刷新不重播，减少动态效果直接显示内容。拦截模型请求后仍按时进入首页；迟到模型使用完整材质与首页构图，不补播入场。内容页继续显示原有正常背景。
- 背景回归 31 项通过，确认原四翼、40 点拖尾、全站渲染、手动及后台暂停、取消加载和 WebGL 失败降级，见 `qa/background-results.json`。本轮未重复完整通用页面和 axe 回归；验证限本机 Chromium 及模拟手机视口。

录屏动图：`qa/intro-sequence-preview.gif`（按真实帧时间生成，末帧额外停留便于查看，循环仅用于预览）。关键帧：`qa/intro-recorded-edges.png`、`qa/intro-recorded-body.png`、`qa/intro-recorded-name.png`。手机截图：`qa/intro-body-390.png`、`qa/intro-name-390.png`、`qa/intro-name-320.png`。本轮前的入场源码备份位于 `archive/intro-v3.0/`。

## v3.0 已恢复

用户撤回 v3.1，恢复上一版的胶囊导航、完整圆角卡片、四张 HTML 内容示意图、原姓名字号与 250ms 入场；移除新增的几何扫光、封面 SVG 和作品切换背景响应。保留六项求职阅读优化、四项作品、OpenClaw 概览、原模型四翼和全站蜻蜓。

- 构建与静态检查通过：16 个双语内容页、4 项作品、510 个链接/资源引用、11 个 CSS/JS 模块。
- 通用浏览器回归 49 项通过，含双语页面、桌面独立滚动、手机菜单、两秒片头、减少动态效果和无 JavaScript 降级；0 个未捕获异常，记录见 `qa/results.json`。
- 背景回归 31 项通过，确认四翼、拖尾、全站场景、暂停恢复、后台停止、取消加载和模型/WebGL 失败降级正常，记录见 `qa/background-results.json`。
- 已对照 v3.0 的 `qa/recruitment-home.png` 目视检查恢复后的桌面首页，并检查手机首页。当前应用内预览已刷新，显示内容示意图与胶囊导航。最新截图为 `qa/desktop-zh.png`、`qa/mobile-zh.png`。
- `DESIGN.md`、主 README 和背景 README 同步恢复到 v3.0。以下 v3.1 留作被撤回方案的历史记录，其专项脚本与四张 SVG 已移除，不再构建或运行。

## v3.1 原创封面与入场层次（已撤回）

- 构建与静态检查通过：16 个中英文内容页、4 项作品、526 个链接/资源引用、11 个 CSS/JS 模块。列表封面新增四张原创 SVG，仅使用灰阶和既有橙色；双语“概念视觉”标记为 12px，详情保留原内容示意图。
- 通用页面回归 49 项、背景回归 31 项、动效回归 45 项、本轮视觉专项 23 项全部通过，均无未捕获异常。结果分别见 `qa/results.json`、`qa/background-results.json`、`qa/motion-results.json`、`qa/visual-refresh-results.json`。动效检查已覆盖全部四作品，并将固定滚动距离改为实际目标卡片定位。
- 片头采样确认：整个退出前阶段仍为居中构图 `x: 0 / zoom: 1`，模型由轮廓恢复主体，姓名在 640ms 后显现，内容约 2.00 秒解除交互限制。已目视检查 350ms、850ms、1400ms 截图。拦截真实模型请求时，片头仍按时结束；释放请求后模型以完整材质和首页构图出现，不补播入场。
- 真实鼠标滚轮切换作品后只触发一次有限响应；快速连续滚动合并到最终作品，同一作品内部滚动不重播。900ms 后额外旋转和翅缘提亮归零；没有增加渲染 pass。暂停会取消未完成响应，暂停期间不能触发，恢复后不补播。减少动态效果保留静态背景，手机响应强度降低。
- 已目视检查桌面首页、作品集四封面、390px 中文与 320px 英文首页、手机作品集以及内容详情：细线导航和底部选中线清楚，正文由实色深底保护，原创封面不冒充产品截图。中英布局回归覆盖 320、390、768、1024、1440px 与矮屏；封面和详情图示没有横向溢出或文字裁切。四张 SVG 加载及四个详情图示分支均通过。
- 保留四翼运动、40 点橙色拖尾、跨页场景衔接、手动及后台暂停、减少动态效果、加载取消、无 JavaScript 和 WebGL 失败降级。原始模型、shader 与旧渲染器备份未替换；正文事实没有扩写。
- 验证使用本机 Microsoft Edge / Chromium 与模拟手机视口，未覆盖 iOS Safari 或 Android 真机；本轮未重跑 axe。服务仍在本地端口 4323，未发布公网。

原专项脚本 `scripts/visual-refresh-check.mjs` 已随方案撤回，以下截图保留为历史。截图：`qa/v31-home-desktop.png`、`qa/v31-home-mobile.png`、`qa/v31-home-mobile-en.png`、`qa/v31-portfolio-desktop.png`、`qa/v31-portfolio-desktop-bottom.png`、`qa/v31-portfolio-mobile-bottom.png`、`qa/v31-detail-mobile.png`，片头截图为 `qa/v31-intro-350.png`、`qa/v31-intro-850.png`、`qa/v31-intro-1400.png`。以下章节保留各版本当时的验证记录，共用结果文件以本轮输出为准。

## v3.0 求职阅读与项目经历

- `npm run build` 与 `npm run check` 通过：16 个中英文内容页、4 项作品、510 个链接/资源引用、11 个 CSS/JS 模块。新增 OpenClaw 工作概览及双语路由；该页仅展示现有简历支持的时间、角色、参与范围和材料依据，不宣称未提供的决策、验证或结果。
- 通用浏览器回归 49 项通过，0 个未捕获异常，见 `qa/results.json`。已将原检查的作品分类数量更新为 2 项项目、2 项分析，并加入新案例中英文路由；导航、筛选、语言切换、滚动恢复、手机菜单、两秒片头、减少动态效果和无 JavaScript 降级均通过。
- 本轮阅读专项 25 项通过，见 `qa/recruitment-results.json`。1440×900 首页首卡约 403px，第二张封面底部约 808px，能完整进入首屏；真实滚轮使位置提示从 01 更新为 02，到列表底部为 04，辅助技术标签没有未替换的占位符。
- 中英文首页在 320×700、390×844 下按钮并排、首件作品进入首屏、无横向溢出。手机简介使用同事实短文，辅助标签保持至少 12px。已目视检查中英文手机首页、桌面首页、博客、关于我和 OpenClaw 详情。
- 中英博客各有两个真实研究入口并指向既有作品详情，未生成虚构独立文章；未配置社交链接在桌面与菜单均不渲染。关于页顺序为相关经历、关注方向、教育、联系，首项经历连接 OpenClaw。新案例使用本地 PDF 来源，三个事实与三个章节完整，未套用飞书登录提示。
- 新封面真实鼠标进入后播放有限反馈并结束，不循环。蜻蜓渲染器与入场构图本轮未修改，原完整背景专项为 v2.9 历史验证；本轮确认新页面也有实时背景，未重复整套背景回归或 axe 抽查。验证使用本机 Microsoft Edge / Chromium 与模拟手机视口，未覆盖 iOS Safari 或 Android 真机。

预览：`http://127.0.0.1:4323/zh/`。主要截图：`qa/recruitment-home.png`、`qa/recruitment-home-zh-320.png`、`qa/recruitment-home-en-320.png`、`qa/recruitment-blog-1440.png`、`qa/recruitment-about-1440.png`、`qa/recruitment-openclaw-1440.png`、`qa/recruitment-openclaw-390.png`。本地服务继续使用端口 4323，未发布公网。

## v2.9 入场居中与主体清晰度

- 构建及静态检查通过：14 个中英文内容页、3 项作品、430 个链接/资源引用、11 个 CSS/JS 模块。
- 入场与主体专项 20 项通过，0 个未捕获异常，结果见 `qa/dragonfly-center-results.json`。确认桌面与手机入场使用居中取景，封面约 2.002 秒结束后，同一场景平滑过渡到首页构图；跳过立即恢复内容操作。另拦截模型请求，确认封面按时结束，迟到的模型直接使用首页构图，不重播入场位移。
- 原背景回归 31 项通过，结果见 `qa/background-results.json`。原模型四翼、橙色鼠标拖尾、手动及后台暂停、减少动态效果、加载取消、模型失败和 WebGL 丢失降级继续有效。
- 已目视检查首页、作品集、博客、关于我的 1440px 桌面和 390px 手机截图，以及 320px 英文首页、桌面长文页。各页面仅一个实时 Canvas，无横向溢出；较轻遮罩和补齐的中灰字符减少主体空洞，文字保持清晰。文章详情沿用原较强阅读遮罩。
- 本轮未重复通用页面回归与 axe 抽查。验证范围为本机 Microsoft Edge / Chromium 和模拟手机视口，未覆盖 iOS Safari 或 Android 真机。原模型、原始 shader 文件与 v2.7 渲染器备份保留；本地服务端口 4323，未发布公网。

预览：`http://127.0.0.1:4323/zh/`。入场截图：`qa/dragonfly-centered-intro.png`、`qa/dragonfly-centered-intro-mobile.png`。页面截图：`qa/dragonfly-clear-home.png`、`qa/dragonfly-clear-portfolio.png`、`qa/dragonfly-clear-blog.png`、`qa/dragonfly-clear-about.png`，手机同名增加 `-mobile`；另有 `qa/dragonfly-clear-home-mobile-en.png` 与 `qa/dragonfly-clear-detail.png`。

## v2.8 蜻蜓恢复与视觉精修

- 构建及静态检查通过：14 个中英文内容页、3 项作品、430 个链接/资源引用、11 个 CSS/JS 模块。恢复蜻蜓为全站唯一背景，移除形态切换入口；旧折带链接和会话自动回到蜻蜓，同时保留其他查询参数、hash 和主动暂停偏好。
- 背景回归 `scripts/background-check.mjs` 共 31 项通过，结果见 `qa/background-results.json`。覆盖原模型四翼、40 点橙色拖尾、手动及后台暂停、减少动态效果、加载取消、模型失败和 WebGL 丢失后的静态降级。
- 本轮精修专项 17 项通过，0 个未捕获异常，结果见 `qa/dragonfly-polish-results.json`。确认旧状态迁移、不请求折带渲染模块、首页取景、有限鼠标视差与停留后的回中，以及光照和翅缘光范围。
- 中英文首页在 320、390、768、1440px 下均无横向溢出，每页仅一个背景 Canvas 和一个暂停控件。无 JavaScript 时蜻蜓静态备用图与内容正常。已目视检查桌面首页、鼠标反馈、阅读页及中英手机首页：主体露在两栏之间，文字保护层保持清晰。
- 本轮没有重复通用 47 项、封面动效 43 项和 axe 抽查，下方记录为对应版本的历史验证。验证使用本机 Microsoft Edge / Chromium 与模拟手机视口，未覆盖 iOS Safari 或 Android 真机。本地服务继续使用端口 4323，未发布公网。

预览：`http://127.0.0.1:4323/zh/`。截图：`qa/dragonfly-polished-home.png`、`qa/dragonfly-polished-pointer.png`、`qa/dragonfly-polished-reading.png`、`qa/dragonfly-polished-mobile.png`、`qa/dragonfly-polished-mobile-en.png`。本轮精修前的渲染器备份保留于 `archive/dragonfly-v2.7/interactive-dragonfly.js`。

## v2.7 字符折带对照预览（历史实验）

- 构建及静态检查通过：14 个中英文内容页、3 项作品、432 个链接/资源引用、13 个 CSS/JS 模块。默认形态改为本地生成的字符折带；原版蜻蜓渲染模块、模型及 shader 完整保留，使用 `?scene=dragonfly` 或页面上的形态按钮可切回。
- `scripts/ribbon-check.mjs` 共 49 项通过，0 个未捕获异常，结果见 `qa/ribbon-results.json`。涵盖首次两秒入场、片头后的持续动画、真实鼠标输入、暂停时切换、原版四翼、快速反复切换及旧加载取消、跨页与语言切换、后退恢复、后台暂停和静态降级。
- 中英文首页、作品集、博客、关于我和 Drimo 详情，在 320、390、1440px 共 30 个页面/尺寸组合中，无横向溢出；切换控件位于视口内，每页仅一个背景 Canvas。已目视检查桌面首页、作品集、阅读页及中英手机首页；缩小并调暗首版折带，桌面转折露在介绍与卡片间，手机使用偏右局部轮廓。
- 检查期间修复媒体偏好诊断读取与 Chromium 通知的时序问题：背景控制器使用事件更新的偏好快照，诊断读取不重复访问 `MediaQueryList.matches`；`pageshow` 仍主动同步一次，覆盖返回缓存页面时的设置变化。最终减少动态效果、静态形态切换、恢复动画及无 JavaScript 内容检查均通过。
- 原版背景专项 31 项通过，结果见 `qa/background-results.json`。确认原模型四翼与橙色拖尾、后台与手动暂停、请求取消、模型失败及 WebGL 上下文丢失后的降级继续有效。本轮没有重复上一版通用 47 项或封面动效 43 项，相关结果保留为历史记录。
- axe-core 4.12.1 抽查桌面中文首页与 320px 英文首页，均为 0 项 violations。动态背景及伪元素遮罩的对比度仍需人工确认；报告见 `qa/ribbon-accessibility.json`，不据此声称完整 WCAG 合规。
- 验证使用本机 Microsoft Edge / Chromium 和模拟手机视口，未覆盖 iOS Safari 或 Android 真机。应用内浏览器已实点切换蜻蜓与折带，最终保留折带预览。服务保持本地端口 4323，未发布公网。

预览：`http://127.0.0.1:4323/zh/?scene=ribbon`、`http://127.0.0.1:4323/zh/?scene=dragonfly`。截图：`qa/ribbon-home.png`、`qa/ribbon-intro.png`、`qa/ribbon-pointer.png`、`qa/ribbon-original-compare.png`、`qa/ribbon-portfolio.png`、`qa/ribbon-reading.png`、`qa/ribbon-mobile.png`、`qa/ribbon-mobile-en.png`。

## v2.6 阅读层次与封面构图

- 构建与静态检查通过：14 个中英文内容页、3 项作品、429 个链接/资源引用、10 个 CSS/JS 模块。本轮重跑既有动效专项，43 项全部通过，0 个未捕获异常，结果见 `qa/motion-results.json`；通用 47 项与背景 31 项没有重复运行，下节保留其历史记录。
- 首页个人介绍增加边缘渐隐的黑色保护层；中英文各检查 320×700、390×844、768×1024、1199×900、1440×600、1440×900，共 12 个组合均无横向溢出，遮罩位于视口内且不拦截操作。补查过程无浏览器异常，13 项结果见 `qa/refinement-results.json`。
- 保留场景总透明度、扇翼与橙色鼠标拖尾，降低枝干亮度并略提升蜻蜓主体。已目视检查桌面首页、作品集、T5 卡片、关于页，以及 320px 英文 Drimo 和 390px 中文首页；姓名与正文背后更暗，留白处仍能辨识蜻蜓，遮罩未形成突兀硬边。
- 封面增加极淡灰阶顶部高光，正文保持实色；OiiOii 横向流程、Drimo 分组流程、T5 对称适配构图分别核对。320px 英文 Drimo 分组上下排列并自然增高，文字完整；中英封面文字边界另由上述 43 项动效检查覆盖。
- axe-core 4.12.1 抽查桌面中文首页与 320px 英文作品集，均为 0 项 violations。伪元素遮罩、渐变背景和装饰字符的对比度仍有 incomplete 项，结合截图人工检查，不据此声称完整 WCAG 合规。报告见 `qa/refinement-accessibility.json`。
- 验证使用本机 Microsoft Edge / Chromium 的桌面及模拟视口，未扩展为 iOS Safari 或 Android 真机验证。应用内预览已刷新并保留，本地服务端口为 4323。

本轮截图：`qa/refined-home.png`、`qa/refined-portfolio.png`、`qa/refined-t5.png`、`qa/refined-mobile-drimo.png`、`qa/refined-mobile-home.png`、`qa/refined-reading.png`。

## v2.5 九项视觉动效

- 2026-10-04 完成本轮构建与静态检查：14 个中英文内容页、3 项作品、429 个链接/资源引用、10 个 CSS/JS 模块。
- 通用页面回归 47 项、背景专项 31 项、新动效专项 43 项全部通过。对应最新结果为 `qa/results.json`、`qa/background-results.json`、`qa/motion-results.json`；新专项脚本为 `scripts/motion-check.mjs`。
- 片头在 1,700ms 开始呈现导航、个人介绍和首张作品，延迟分别为 0/60/120ms；单项动画 180ms，完整片头仍约 2.002 秒。跳过、Escape、会话不重播和减少动态效果继续有效。
- 真实鼠标触发三张封面的有限序列，结束后不循环；键盘进入卡片也能触发，卡内移动焦点不重播。首次进入视口的作品进行 220ms 入场，已看过的作品及返回页面后的已看内容不重播。
- 验证本机 Chromium 实际触发跨文档 View Transition，导航保持共享底板、正文淡入；同源页面跳转带入上一帧和场景时间。阅读页背景偏向右侧，博客使用略小轮廓，原版扇翼、鼠标拖尾、暂停、失败降级与后台资源控制均通过回归。
- 按钮按下时实测为 `scale(0.98)`；首次测试过早点击仍在转场中的页面，补为转场结束后操作并通过。复制成功保持按钮宽度不变，模拟失败时正确选中邮箱并显示手动复制说明。
- 手机菜单实测展开动画、正文隔离、快速关闭再打开、Escape 焦点返回均正确。章节链接落在导航下方约 112px，标题获得焦点并短暂显示橙色定位线。
- 修复并核对浏览器后退后的暂停偏好、未看作品的入场观察；保留场景快照时新画面直接接替，避免旧快照先消失后 Canvas 才渐入。
- 中英作品集及 Drimo 详情在 320/390/768/1440px 下无横向溢出、封面文字不裁切；目视检查统一节点后的手机 Drimo/T5 与桌面首页、阅读页、博客构图。T5 保持无方向适配连线。
- axe-core 4.12.1 抽查首页、作品集、关于我及分析详情，均为 0 项 violations；背景和装饰对比度仍有需要人工确认的 incomplete 项。报告为 `qa/motion-accessibility.json`，不据此声称完整 WCAG 合规。
- 本轮仅在本机 Chromium 验证；跨文档 View Transition 使用渐进增强，未支持的浏览器使用正文淡入。手机断点/减少动态效果已测试，未声称覆盖 iOS Safari 或 Android 真机。

本轮截图：`qa/motion-intro-transition.png`、`qa/motion-cover-hover.png`、`qa/motion-home.png`、`qa/motion-reading.png`、`qa/motion-blog.png`、`qa/motion-mobile-menu.png`、`qa/motion-mobile-diagram.png`、`qa/motion-section-arrival.png`。

## v2.4 视觉层级与内容示意图

- `npm run build` 与 `npm run check` 通过：14 个中英文内容页、3 项作品、399 个链接/资源引用。
- 通用浏览器回归 47 项通过，片头含淡出约 2.006 秒；桌面双栏滚动、手机菜单、筛选、语言切换、减少动态效果与无 JavaScript 降级均通过。当前结果见 `qa/results.json`；下方旧版本段落为历史记录。
- 本轮新增一次性尺寸采样，最终记录 62 个页面/尺寸组合：中英首页、作品集及三项详情在 320、390、768、1440px 下均无横向溢出，封面未超过父容器，图示文字未超出封面边界；另补查关于、博客与 1199px 内容页。结果见 `qa/visual-layout-results.json`，未捕获异常为 0。
- 检查中修复了手机封面最小高度反推宽度导致裁切，以及 768px 阅读遮罩超出页面的问题。封面明确限制宽度；平板遮罩外延收至 32px、手机 16px。
- 已目视检查桌面首页、作品集、关于页、320px 英文三张封面、390px 中文作品集和 768px 英文分析详情。作品标题与正文层级清晰，长文阅读区域变暗，边缘仍可见蜻蜓。
- axe-core 4.12.1 抽查中文首页、320px 英文作品集、关于页和分析详情：均为 0 项 violations。动态背景与部分装饰线的对比度仍列为 incomplete，结合截图人工核对，不据此声称完整 WCAG 合规。结果见 `qa/visual-accessibility.json`。
- 原版实时背景代码本轮未修改；截图采集时确认首页、作品集、关于及详情的场景加载完成。完整背景生命周期仍以上轮 `qa/background-results.json` 为记录，本轮没有重复全部背景专项检查。

本轮截图：`qa/visual-home.png`、`qa/visual-portfolio.png`、`qa/visual-about.png`、`qa/visual-mobile-en.png`、`qa/visual-mobile-drimo.png`、`qa/visual-mobile-t5.png`、`qa/visual-mobile-zh.png`、`qa/visual-tablet-detail.png`。

## v2.3 全站交互背景

- 构建与静态检查通过：14 个中英文内容页、399 个链接/资源引用。
- 背景验收脚本覆盖中英文作品集、博客、关于我及作品详情，桌面和手机均确认实时场景运行、单 Canvas、单暂停控件、无入场片头及横向溢出；完整结果见 `qa/background-results.json`。
- 首页暂停后进入作品集并切换语言，暂停偏好仍保留；从内容页恢复后帧继续增长。原有后台暂停、加载取消、模型失败降级及首页片头检查通过。
- 补查了 1440×900 中文三个主内容页、320×700 英文三个主内容页；关于页实测鼠标拖尾有活跃采样点、滚轮可自然滚动 500px，没有未捕获异常。
- 已目视检查作品集、博客、关于页与极窄英文作品集，文字、卡片和背景分层正常。截图：`qa/portfolio-background.png`、`qa/blog-background.png`、`qa/about-background.png`、`qa/portfolio-background-mobile.png`。
- 以下 v2.1/v2.2 的“内容页不加载 WebGL”等记录为历史行为，已被本版本的全站背景要求替代。404 保持无场景。

## 通用页面检查（v2.2 已重跑）

- 构建 14 个中英文内容页面；静态检查覆盖内链、本地资源、模块、分类、单一 H1 和语言切换地址。
- 真实浏览器测得入场含退场约 2.003 秒；跳过和 Escape 立即退出，退出后片头移除、内容解除 inert；v2.1 背景 Canvas 保留用于首页持续交互。
- 同会话刷新、返回首页、语言切换不重播；详情深链接直接显示正文。
- 1440×900 首页双栏；鼠标滚轮和 PageDown 只滚动右栏，左栏位置不变。
- 详情页正常点击首页链接可恢复作品列表；语言切换保留正在浏览的作品；筛选在语言间保留。
- 中英文分别检查 320×700、390×844、768×1024、1024×768、1440×600，均为自然页面滚动且无横向溢出。
- 720×450 有效视口检查通过，覆盖 1440×900 放大到 200% 时的布局尺寸；这不等于已通过浏览器工具栏实际设置 200% 缩放。
- 手机菜单打开时隔离正文并管理焦点；Escape 关闭后焦点返回按钮。
- 中英四类页面与三项详情均可直接访问。作品类型筛选结果为 1 项项目、2 项分析。
- 减少动态效果跳过片头；阻止字体及装饰加载后仍按时进入；无 JavaScript 时手机导航与内容可读。
- 当前已检查场景没有未捕获的浏览器异常。
- axe-core 4.12.1 检查首页、作品集、关于页、分析详情，最终报告均为 0 项 violations；动态图片背景和装饰箭头对比度仍被列为需人工确认，已检查桌面和手机截图，不据此声称完整 WCAG 合规。报告见 `qa/accessibility.json`。
- 本地 HTTP 检查确认根路径跳转、PDF 的 200 / `application/pdf`、直接详情访问及未知地址 404。

完整自动化结果保存在 `qa/results.json`。主要截图：`qa/intro.png`、`qa/desktop-zh.png`、`qa/desktop-en.png`、`qa/mobile-zh.png`、`qa/mobile-en.png`、`qa/mobile-menu.png`、`qa/fallback.png`、`qa/no-js.png`。

## 验证范围

只做了本机 Chromium 浏览器验证，未声称覆盖 iOS Safari、Android 真机或所有辅助技术。实际浏览器工具栏 200% 缩放和极端慢网的人工检查尚未全部完成。外部飞书链接按用户提供地址接入，本文不保证访客具备文档权限。简历已与原 PDF 校验一致。

## v2.1 原版背景交互

同日升级并检查真实模型与原版着色器：四翼角度随时间变化，首页仍持续渲染；鼠标移动激活 40 点拖尾；作品滚轮与移动菜单不受影响。测试了减少动态效果释放/重新挂载、真实后台标签页停止帧计数、恢复焦点继续、手机无 hover 时持续扇翼、详情不加载 WebGL、模型请求失败与主动丢失上下文后的静态降级。入场仍约 2.002 秒，不等待模型加载。

完整结果见 `qa/background-results.json`，脚本为 `scripts/background-check.mjs`。桌面/鼠标/手机截图为 `qa/interactive-desktop-idle.png`、`qa/interactive-desktop-pointer.png`、`qa/interactive-mobile.png`。当前内置浏览器也已刷新，确认模型在约 315ms 加载完成并显示实时背景。

## v2.2 求职阅读与交互优化

- `npm run build` 和 `npm run check` 通过，14 个双语页面、3 个作品、387 个链接/资源引用；通用浏览器脚本 47 项通过，背景脚本 25 项通过，未捕获浏览器异常为 0。
- 首页顺序为 OiiOii、Drimo、T5；1440×900 下第一件作品完整显示，并露出第二件作品。文字封面与摘要未裁切。中文手机保持自然滚动；390×844 英文首页的两个主要按钮并排，首件作品封面进入视口。320px 下无横向溢出。
- 内置浏览器真实点击“复制邮箱”，按钮及状态显示“已复制”。另模拟剪贴板拒绝，页面选中正确邮箱并显示手动复制提示，保留 `mailto:`。
- OiiOii 详情原文入口位于标题摘要后；阅读导航跳到 `#scenario` 时章节顶部约 112px，位于 88px 高度边界的固定导航下方。T5 不显示虚构项目过程；320×700 下原文按钮底部约 520px，可直接访问。
- 背景手动暂停后帧数保持不变；恢复继续。暂停偏好跨作品集返回、切换语言仍保留，暂停状态重访不下载模型。
- 无鼠标输入时 `trailDraws=0`，扇翼与 ASCII 继续；12 次相同尺寸 resize 未增加 GPU resize 次数。真实模型请求通过 CDP 拦截挂起，再点击暂停，7ms 内结束加载状态，之后恢复为单个正常运行的 Canvas。
- 减少动态效果释放场景并可重挂；后台标签页停止帧数、回到前台继续；手机、模型失败与上下文丢失降级均通过。
- HTTP 验证 GLB/WASM/PDF 返回正确 MIME 和 200；携带 ETag 的再次请求返回 304、空响应体。英文未知路径返回 404、`noindex`，语言按钮指向中文首页。
- 页面具有按内容区分的 description、对应双语 hreflang、OG/Twitter 文本元信息；尚未配置正式域名，不输出虚构 canonical 或 `og:url`。

截图：`qa/desktop-zh.png`、`qa/mobile-en.png`、`qa/detail-optimized.png`、`qa/prd-mobile.png`，以及更新后的交互背景截图。旧版背景段落保留为历史记录，当前实际结果以本节及 JSON 报告为准。

## 左栏视觉平衡调整

2026-10-03 根据用户圈选调整桌面介绍位置。在 1440×900 下，中文介绍左边缘从 60px 移至约 92px，顶部从 136px 移至约 219px；英文顶部约 212px，内容宽度均为 440px。独立背景控件与文字左边缘对齐，距视口底部 24px。

检查了中英桌面 1440×900、宽屏 1920×1080、英文 1280×760、中文 390×844、英文 320×700 和 1440×600：没有横向溢出；桌面控件与介绍不重叠；手机和矮屏仍为自然滚动。应用内浏览器实点暂停/恢复，控件反馈正常。构建与静态检查通过。截图为 `qa/balanced-desktop.png`、`qa/balanced-desktop-en.png`、`qa/balanced-mobile.png`。
