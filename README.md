# LOLPlay homepage

**English** | [简体中文](README.zh-CN.md)

Static research homepage for **LOLPlay: Benchmarking Real-Time Visual Agents in League of Legends**. It includes interactive results, a searchable catalog of 36 tasks, and gameplay figures.

## Preview

Run `node server.mjs`, then open http://127.0.0.1:4173. No dependencies or build step are required.

## GitHub Pages

Publish the `main` branch from `/ (root)` in **Settings → Pages → Deploy from a branch**. `.nojekyll` publishes the static files without Jekyll processing.

Planned site: https://answers111.github.io/LOL-Play-homepage/

All site assets use relative URLs so the homepage and task showcase work under the repository path. `index.html` is the homepage; `task-showcase/` contains the task browser; `assets/` contains figures; `data/` contains task definitions and results.

## Content

Website content and research assets are supplied in the original homepage archive. The website is independent of the private game-code repository. Website layout attribution is retained in the footer.
