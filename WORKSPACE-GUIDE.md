# Media Dock Workspace Guide

当前代码仅支持 macOS（Apple Silicon 与 Intel）。

## Daily Use

- `../Media Dock.app`
  - 日常原生启动入口，不弹终端；菜单退出或 ⌘Q 后不保留启动器进程。
  - 通过 `npm run build:launcher:mac` 生成（需要 Swift 命令行工具）；入口和项目使用相对路径关联，请一起移动。
  - 准备失败会显示原生提示，准备日志保存在项目 `output/launcher/startup.log`。
- `../Launch Media Dock 3 Preview.command`
  - macOS 命令行排错入口。它和 `Media Dock Project/` 并排放在外层，双击即可构建并打开当前 3.0 预览。
  - 需要 Node.js 24 或更新版本。依赖被清理后，启动器会按 `package-lock.json` 恢复依赖；桌面运行组件不完整时会尝试修复。首次恢复需要联网，失败时终端保留明确提示。
  - `MEDIA_DOCK_LAUNCHER_DRY_RUN=1 MEDIA_DOCK_SKIP_BUILD=1` 只检查本地启动条件，不自动安装、修复或构建。
  - 可恢复副本保存在 `scripts/Launch Media Dock 3 Preview.command`；迁移电脑后可直接运行，也可复制到项目文件夹旁边。
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

- `Media Dock.app`（日常启动）

- `Launch Media Dock 3 Preview.command`
- `Media Dock Project/`

两个启动入口都依赖同级的项目总文件夹，不能只移动 `.app` 或 `.command`。

若从 GitHub 重新下载，仓库内的 `scripts/Launch Media Dock 3 Preview.command` 是同一启动器的可恢复副本，不包含任何本机路径或私人数据。
