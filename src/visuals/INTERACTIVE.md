# 原版交互背景模块

`interactive-dragonfly.js` 导出：

```js
const controller = new AbortController();
const background = await mountInteractiveDragonfly(canvas, {
  signal: controller.signal,
  onReady(background) {},
});
background.pause();
background.resume();
background.getState();
background.dispose();
// 页面控制器也可在加载尚未完成时调用 controller.abort()。
```

Canvas 应保持完整容器尺寸，CSS 使用 `pointer-events: none`，并由页面控制背景层级和透明度。模块通过被动 `window.pointermove` 监听鼠标，不会接管滚轮、点击或触摸滚动。`onReady` 在第一个完整 WebGL 帧成功绘制后调用；加载失败会释放已创建的资源并抛错，调用方保留静态备用图即可。

保留原站行为：真实 GLB 首帧姿态和相机、四个独立翼节点的正弦扇动、法线明暗材质、1024px 字符图集、6px ASCII 网格、40 点速度相关鼠标拖尾，以及沿模型轮廓发生的字形和橙色变化。鼠标还产生原站幅度相同的轻微模型倾斜。场景包含原模型中的蜻蜓及树枝，无文字、logo、导航、追踪或主题切换。

本站内容页固定在原站的首帧场景；没有把页面或作品列表滚动绑定到原站飞行、镜头离场和其他模型。这与原站长页随滚动推进 GLB 动画的机制有所区别。桌面/移动相机 FOV 分别为 11°/16°。采用站内橙色 `#FA4C14` 和灰白 `#F2F2F2`，不引入原站其他主题色。

资源为已有本地参考发行版中的 Three.js、GLTF/Draco loader、GLB 模型和原始 GLSL 的独立摘取；没有引入 Nuxt、Vue、GSAP 或全站压缩入口。文件是公开前端发行版素材，不是原始作者工程源码。

运行性能：最大 30fps、DPR≤1.5、四分之一分辨率鼠标拖尾；解码完成即终止 Draco workers。后台、窗口失焦和 `pause()` 均取消 RAF，恢复可见/焦点或 `resume()` 后继续。`dispose()` 清理全部事件、ResizeObserver、RAF、AnimationMixer、材质、纹理、几何、render targets、renderer 与 WebGL context。减弱动态效果、静态降级和片头计时由页面控制器负责。

`getState()` 返回帧数、运行/暂停状态、鼠标坐标与移动次数、拖尾活跃点数/强度、翼节点角度和渲染资源统计，供本地 QA 使用，不发送到任何服务。

v2.2：AbortSignal 取消 GLB/Draco 下载、解码与已创建的 GPU 资源。鼠标拖尾完全衰减后仅清空一次纹理并跳过后续拖尾 pass，扇翼与 ASCII 仍持续运行；新输入恢复拖尾。resize 同帧合并，宽高与 DPR 没变化时不重分配画布。诊断增加 `trailDraws`、`trailClears`、`resizeCount`。首页提供手动暂停/恢复，并在当前标签页会话记住偏好。

v2.3：相同场景扩展到作品集、博客、关于我及作品详情，覆盖中英文。各页共享暂停偏好，每页只有一个 Canvas 和一个控制按钮；离开页面释放旧场景，下一页按偏好挂载。内容页不播放首页片头，404 不挂载背景。
