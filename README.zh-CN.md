# LOLPlay 项目主页

[English](README.md) | **简体中文**

**LOLPlay: Benchmarking Real-Time Visual Agents in League of Legends** 的静态研究主页，包含交互式结果、36 个任务的可搜索目录和游戏配图。

## 本地预览

运行 `node server.mjs`，打开 http://127.0.0.1:4173。无需安装依赖或构建。

## GitHub Pages

在 **Settings → Pages → Deploy from a branch** 选择 `main` 分支和 `/ (root)`。`.nojekyll` 使静态文件直接发布，不经过 Jekyll 处理。

计划发布地址：https://answers111.github.io/LOL-Play-homepage/

资源使用相对路径，主页与任务展示页可在仓库子路径下运行。`index.html` 为主页，`task-showcase/` 为任务浏览器，`assets/` 包含配图，`data/` 包含任务和结果。

## 内容来源

网站内容和研究素材来自提供的主页源码压缩包。网站独立于私有游戏代码仓库。页脚保留网站布局参考来源。
