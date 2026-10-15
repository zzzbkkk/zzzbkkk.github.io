# GitHub Pages 部署

当前站点使用根路径资源和双语目录路由，部署目标为个人根站点：

- 仓库名称：`zzzbkkk/zzzbkkk.github.io`
- 仓库地址：`https://github.com/zzzbkkk/zzzbkkk.github.io`
- 网站地址：`https://zzzbkkk.github.io/`
- 中文入口：`/zh/`
- 英文入口：`/en/`

不要将当前构建直接部署到带仓库名前缀的 `/repo/` 项目站点，除非先完成全站资源与导航的基础路径适配。

## 发布流程

1. 在 GitHub 创建个人站点仓库，提交网站源码到 `main` 分支。
2. 在仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
3. `.github/workflows/deploy-pages.yml` 会构建、检查并发布 `dist/`。
4. 等待 Actions 中的部署成功，再打开正式网址验证。

无需安装 npm 依赖。部署使用 Node.js 22，执行 `npm run build` 和 `npm run check`。只有构建产物会发布为网页；本地服务 `server.mjs` 不在 GitHub Pages 上运行。根目录直接显示中文首页，双语页面与作品详情可以直接访问，未知地址使用根目录的 `404.html`。

## 后续更新

修改 `src/` 或 `public/` 后，先在本地执行构建和检查，再提交并推送到 `main`。GitHub Actions 会自动重新部署；无需保持本地电脑和预览服务运行。

历史版本 `archive/`、参考图片、浏览器验证截图、日志和本地环境文件不提交。网站正文、公开下载的简历及运行所需资源随站点发布。

首次发布及后续更新应验证首页、作品集、博客、关于我、英文页面、简历下载和蜻蜓模型资源。线上验证记录见 `docs/QA.md`。
