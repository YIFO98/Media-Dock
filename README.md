<p align="center">
  <img src="build/readme-hero.png" width="100%" alt="Media Dock · 泊 — 泊其所获，交其所成。A QIDU Utility">
</p>

<p align="center">
  <a href="https://github.com/Yifo98/Media-Dock/releases/latest"><img alt="Stable release" src="https://img.shields.io/github/v/release/Yifo98/Media-Dock?display_name=tag&label=stable&sort=semver"></a>
  <a href="https://github.com/Yifo98/Media-Dock/releases/tag/v3.0.2"><img alt="Media Dock 3" src="https://img.shields.io/badge/Media%20Dock-3.0.2-c7b9f3"></a>
  <img alt="Platforms" src="https://img.shields.io/badge/platform-macOS-73cbd7">
  <img alt="Local first" src="https://img.shields.io/badge/privacy-local--first-24313b">
</p>

Media Dock · 泊是器度 QIDU 旗下的本地优先媒体获取、音画合并与交付工作台。它把公开链接、B 站剧集、YouTube 合集、登录画质检测、批量任务、独立音画合并和问题诊断收进一个可恢复的桌面流程。应用在本机使用 `yt-dlp`、FFmpeg、Deno 与 MediaCookies；Cookie 值不会进入界面、任务数据库或导出的支持日志。

## 版本状态

| 版本线 | 状态 | 适合谁 |
| --- | --- | --- |
| 3.0.4-preview.5 | 当前源码维护候选，仅 macOS | 需要原生启动、刷新、重启与 Cookie 修复的用户 |
| 3.0.2 | 既有稳定发布 | 使用 3.0 工作台、任务模型与独立数据目录的用户 |
| [3.0.3](https://github.com/Yifo98/Media-Dock/releases/tag/v3.0.3) | 已发布的兼容性预览 | 测试 YouTube 403 恢复与网络中断提示的用户 |
| [2.1.2](https://github.com/Yifo98/Media-Dock/releases/tag/v2.1.2) | 旧版维护线 | 需要旧界面和旧数据布局的用户 |

Media Dock 3 使用独立的 `Media Dock Data/v3/` 数据边界，不会改写 2.1.2 数据。从 `3.0.4-preview.4` 起，当前代码只支持 macOS（Apple Silicon 与 Intel）。未签名、未公证的便携包仍标记为开发预览，可能被 macOS Gatekeeper 拦截。

## Media Dock 3 一览

| 中文工作台 | English workspace |
| --- | --- |
| ![中文处理工作台](docs/showcase/3.0.0/01-workbench-zh.png) | ![English processing workspace](docs/showcase/3.0.0/06-workbench-en.png) |
| 剧集自动分组 | 音画合并 |
| ![剧集自动分组](docs/showcase/3.0.0/02-collection-zh.png) | ![音画合并](docs/showcase/3.0.0/03-merge-zh.png) |
| Cookie 导入结果 | Cookie import result |
| ![中文 Cookie 导入结果](docs/showcase/3.0.0/05-cookies-zh.png) | ![English Cookie import result](docs/showcase/3.0.0/07-cookies-en.png) |

更多截图：[任务中心](docs/showcase/3.0.0/04-tasks-zh.png)。原始展示图均来自真实 Electron 界面，尺寸为 1280×768 PNG、无透明层。

观看 [16 秒双语功能演示](docs/showcase/3.0.0/Media-Dock-3.0.0-demo.mp4)，或在 Release 中下载完整媒体素材包。

## 主要能力

- **先识别，再创建任务**：在下载前解析来源、集合结构、登录状态和可用画质。
- **剧集与多单链接**：剧集、PV、花絮和音乐自动分组；也可批量添加互不相关的单条链接。
- **MediaCookies 本地交接**：导入浏览器扩展生成的 ZIP，用于检测会员或登录画质，不展示 Cookie 内容。
- **画质与大小预估**：在创建任务前显示当前登录状态可用的画质上限和估算体积。
- **1 / 2 / 3 并发**：以稳妥、推荐、快速三种调度档位运行独立任务。
- **音画合并**：一次多选音频与视频，按媒体流、时长和时间轴配对，不依赖相似文件名。
- **任务中心**：显示获取、处理、交付进度，完成后可直接打开所在位置。
- **安全清理**：清理任务历史和临时缓存不会删除已经交付到保存位置的媒体。
- **设置刷新与重启**：内核及登录信息可刷新本地状态；内核更新后可在应用内确认重启，有任务或更新进行时会阻止重启。
- **诊断与支持**：导出经过脱敏的 TXT，保留系统、运行工具和问题证据，但排除 Cookie、凭证、完整链接参数、用户目录和媒体路径。

## 下载与运行

前往 [GitHub Releases](https://github.com/Yifo98/Media-Dock/releases)：

- 已有发布包请选择对应架构的 **macOS** 资产；本次 `3.0.4-preview.5` 更新通过源码启动器使用，尚未发布新安装包。
- macOS 只保留一个入口：`Launch Media Dock.command`；应用运行组件收纳在 `core/Media Dock.app`。

标准分享包由 `electron-builder` 生成，并在启动入口同级的 `Media Dock Data/` 保存任务数据、工具和缓存。带 `Unsigned` 标记的资产只供可接受系统安全提示的测试者；它不是已经取得平台信任的签名包。

## MediaCookies

需要登录态或会员画质时：

1. 从 [Chrome Web Store](https://chromewebstore.google.com/detail/xf-mediacookies/pkpnjlcfhkgiapclmidlhfgjklhifcek) 或 [GitHub](https://github.com/Yifo98/MediaCookies) 安装 MediaCookies。
2. 在目标网站完成登录。
3. 从扩展导出本地 ZIP。
4. 在 Media Dock 的“设置 → 网站登录信息”中导入或更新。

3.0 只把登录资料保存到 `Media Dock Data/v3/authentication-profiles/`。导入成功后会显示识别到的站点数与 Cookie 条目总数，但不会显示 Cookie 名称和值；需要检查本地副本时可在设置中点击“打开 Cookies 文件夹”。

MediaCookies 不读取密码，也不会把 Cookie 上传到网络。

当前 3.0.4 本地维护候选中，明确的 Cookie 失效或试看限制会提示更新登录资料，试看片段不会作为完整成品交付。更新 MediaCookies 后，画质与未开始的任务计划会自动刷新，无需重启应用；账号仍需拥有视频的完整观看权限。

## 本地开发

要求：macOS（arm64 或 x64）、Node.js 24、npm。

```bash
npm ci --include=dev
npm run build:launcher:mac
```

日常双击项目旁的 **`Media Dock.app`**：先显示原生准备提示，随后直接进入桌面应用，不打开终端。使用菜单退出或 ⌘Q 后，应用与辅助进程一起结束。首次生成入口需要 macOS 命令行开发工具（Swift）；入口生成后会复用现有依赖恢复、构建与 v3 数据流程。请保持入口与项目文件夹的相对位置。

命令行排错仍可使用 `npm run launch:mac:v3` 或原 `Launch Media Dock 3 Preview.command`。这一方式的终端窗口由 Terminal 自身的退出偏好决定；应用不会修改这些偏好或关闭其他终端页。原生入口的准备日志位于 `output/launcher/startup.log`，不收集应用运行期间的输出。

## 验证

```bash
npm test
npm run lint
git diff --check
```

发布候选还必须完成 [Media Dock 3 release gates](docs/release/3.0-release-gates.md)，特别是实际 macOS 打包资产、中文与空格路径、目录操作、MediaCookies 导入、运行时更新与诊断导出。

## OpenAI Build Week

参赛要求、时间、提交物、资格限制和 Media Dock 准备清单见 [OpenAI Build Week 参赛要求](docs/hackathon/openai-hackathon-requirements.md)。既有项目只评审提交期内的实质扩展；正式提交还需要 Codex `/feedback` Session ID、GPT-5.6 的真实产品集成、三分钟以内公开演示和可直接测试的构建。

## 文档

- [3.0.4 本地维护候选与验证范围](docs/implementation/3.0.4-maintenance.md)
- [3.0 product brief](docs/design/3.0-product-brief.md)
- [Implementation sequence](docs/implementation/3.0-sequence.md)
- [Release guide](docs/RELEASES.md)
- [Architecture decisions](docs/adr/)

---

## English

Media Dock · 泊 is a QIDU local-first desktop workspace for acquiring public media, resolving authenticated quality, grouping collections, merging separate audio/video tracks, tracking deliverables, and exporting privacy-safe diagnostics.

**Dock what is gathered, deliver what is made.** · A QIDU Utility

### Release channels

| Channel | Status | Audience |
| --- | --- | --- |
| 3.0.4-preview.5 | Current source preview, macOS only | Users testing native launch, settings refresh, restart and Cookie fixes |
| 3.0.2 | Existing stable release | Users adopting the workspace, task model, and isolated 3.0 data boundary |
| [3.0.3](https://github.com/Yifo98/Media-Dock/releases/tag/v3.0.3) | Published compatibility preview | Users testing YouTube 403 recovery and network interruption guidance |
| [2.1.2](https://github.com/Yifo98/Media-Dock/releases/tag/v2.1.2) | Legacy maintenance line | Users who still need the previous UI and data layout |

Media Dock 3 owns the isolated `Media Dock Data/v3/` namespace and never rewrites 2.1.2 data. Starting with `3.0.4-preview.4`, current source supports macOS only, on Apple Silicon and Intel. Unnotarized or unsigned packages remain developer previews and may be blocked by Gatekeeper.

Watch the [16-second bilingual feature demo](docs/showcase/3.0.0/Media-Dock-3.0.0-demo.mp4), or download the complete media pack from the Release.

### Highlights

- Inspect sources, authentication state, collection structure, available quality, and estimated size before creating work.
- Group main episodes, previews, extras, and music with independent selection controls.
- Batch unrelated links or schedule collection entries with bounded 1 / 2 / 3 task concurrency.
- Import a local MediaCookies ZIP without exposing Cookie values to the renderer, task database, or support log.
- Pair separate video and audio by stream type, duration, and timeline rather than filename similarity.
- Track acquisition, processing, delivery, authentication use, and the selected quality ceiling per task.
- Clear terminal history and managed staging without deleting delivered media.
- Export a user-reviewed support TXT that removes credentials, Cookie values, URL queries, home-directory details, task titles, and media paths.

### Install

Choose the macOS asset for your architecture from [GitHub Releases](https://github.com/Yifo98/Media-Dock/releases). The `3.0.4-preview.5` changes are available through the source launcher; no new binary package has been published.

- macOS: run the single root entry, `Launch Media Dock.command`; the internal app runtime remains under `core/Media Dock.app`.

Packages are produced by `electron-builder`; portable data stays in the sibling `Media Dock Data/` directory. Assets labeled `Unsigned` are controlled-test artifacts only. Gatekeeper may block them before launch, so they are not general-public releases.

In the local 3.0.4 maintenance candidate, explicit expired-Cookie and preview-only warnings block incomplete delivery and offer sign-in recovery. Importing fresh MediaCookies refreshes quality inspection and unstarted plans without restarting; the account must still have full-video access.

### Development and checks

```bash
npm ci --include=dev
npm run build:launcher:mac
npm test
npm run lint
```

After generating the source entry, double-click `Media Dock.app` beside the project. It prepares the build without Terminal, then replaces the launcher with the native runtime. Quit or ⌘Q ends the application and its helpers. Keep the entry and project together; `.command` remains a diagnostic option.

See the [3.0 release gates](docs/release/3.0-release-gates.md), [release guide](docs/RELEASES.md), and [OpenAI Build Week checklist](docs/hackathon/openai-hackathon-requirements.md) for the full verification and submission boundaries.
