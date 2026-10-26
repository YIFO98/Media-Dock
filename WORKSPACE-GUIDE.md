# Media Dock Workspace Guide

当前代码仅支持 macOS（Apple Silicon 与 Intel）。

## Daily Use

- `../Media Dock.app`
  - 唯一日常原生启动入口，不弹终端；菜单退出或 ⌘Q 后不保留启动器进程。
  - 通过 `npm run build:launcher:mac` 生成（需要 Swift 命令行工具）；入口和项目使用相对路径关联，请一起移动。
  - 准备失败会显示原生提示，准备日志保存在项目 `output/launcher/startup.log`。
- `Media Dock Project/`
  - 完整开发仓库；源码、测试、构建产物、工具、应用数据和 `.git` 都收在这里。

## Internal Package Testing

- `release/<version>/Media-Dock-<version>-Unsigned-Developer-Preview-<arch>-mac.zip`
  - 只用于受控的 macOS 内部测试；未签名、未公证的包不能作为公开分享版。

## Private / Do Not Share

- `cookies/`
  - Private cookie files. Never send these to other people.

## Core Project Files To Keep

- `src/`
- `electron/`
- `scripts/`
- `tools/`
- `public/`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig*.json`
- `eslint.config.js`
- `index.html`
- `README.md`

## Regeneratable Build Output

These can be recreated by building again, so they do not need special backup:

- `../Media Dock.app`（`npm run build:launcher:mac`）
- `output/launcher/`（本机准备日志）

- `release/<version>/Media-Dock-<version>-Unsigned-Developer-Preview-<arch>-mac.zip`

## Already Cleaned Up

The following generated clutter was removed:

- `dist/`
- `dist-electron/`
- `release/builder-debug.yml`

## Finder Layout

外层 `Media-Dock/` 保留：

- `Media Dock.app`（唯一启动入口）
- `Media Dock Project/`

源码入口依赖同级的项目总文件夹，请保持 `Media Dock.app` 与 `Media Dock Project/` 的相对位置。

从 GitHub 下载源码后运行 `npm ci --include=dev` 和 `npm run build:launcher:mac` 生成唯一入口。`scripts/prepare-mac-app.sh` 仅供原生入口内部准备依赖和构建，不会单独启动桌面端。
