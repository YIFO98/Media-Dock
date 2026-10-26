#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTRON_BIN="$PROJECT_ROOT/node_modules/.bin/electron"
ELECTRON_PACKAGE_DIR="$PROJECT_ROOT/node_modules/electron"
ELECTRON_PATH_FILE="$ELECTRON_PACKAGE_DIR/path.txt"
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"

fail() {
  print -u2 "Media Dock 3 Preview launcher could not start."
  print -u2 "$1"
  if [[ -t 0 && -t 1 && "${MEDIA_DOCK_LAUNCHER_DRY_RUN:-0}" != "1" ]]; then
    read -r "?按回车键关闭…" || true
  fi
  exit 1
}

[[ "$(uname -s)" == "Darwin" ]] || fail "This launcher is for macOS."
[[ -f "$PROJECT_ROOT/package.json" ]] || fail "package.json was not found at $PROJECT_ROOT"
command -v node >/dev/null 2>&1 || fail "未找到 Node.js。请安装 Node.js 24 后重新打开。"
command -v npm >/dev/null 2>&1 || fail "未找到 npm。请修复 Node.js 24 安装后重新打开。"
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)' \
  || fail "Node.js 版本过旧。请安装 Node.js 24 或更新版本后重新打开。"
cd "$PROJECT_ROOT"

if [[ "${MEDIA_DOCK_LAUNCHER_DRY_RUN:-0}" != "1" ]]; then
  zmodload zsh/system || fail "无法加载 macOS 启动锁，请检查系统 zsh 安装。"
  touch "$PROJECT_ROOT/.media-dock-launcher.lock" || fail "项目目录不可写，无法准备启动。"
  zsystem flock -t 0 -f MEDIA_DOCK_LAUNCH_LOCK_FD "$PROJECT_ROOT/.media-dock-launcher.lock" \
    || fail "另一个启动器正在准备应用，请等待原来的启动窗口完成。"
fi

if [[ ! -x "$ELECTRON_BIN" || ! -x "$PROJECT_ROOT/node_modules/.bin/vite" || ! -x "$PROJECT_ROOT/node_modules/.bin/tsc" ]]; then
  [[ "${MEDIA_DOCK_LAUNCHER_DRY_RUN:-0}" != "1" ]] \
    || fail "Project dependencies are missing. 请重新双击启动器以恢复依赖。"
  [[ -f "$PROJECT_ROOT/package-lock.json" ]] \
    || fail "缺少 package-lock.json，无法按锁定版本恢复依赖。请恢复完整项目后重试。"
  print "[1/3] 正在恢复项目依赖（首次启动或清理后需要下载，请稍候）…"
  npm ci --include=dev --no-audit --no-fund \
    || fail "依赖恢复失败。请检查上方错误和网络连接，再重新双击启动器。"
fi

electron_runtime_ready() {
  [[ -x "$ELECTRON_BIN" && -f "$ELECTRON_PATH_FILE" ]] || return 1
  local runtime_relative_path="$(<"$ELECTRON_PATH_FILE")"
  [[ -n "$runtime_relative_path" && -x "$ELECTRON_PACKAGE_DIR/dist/$runtime_relative_path" ]]
}

if ! electron_runtime_ready; then
  [[ "${MEDIA_DOCK_LAUNCHER_DRY_RUN:-0}" != "1" ]] \
    || fail "Electron runtime is incomplete. Run npm rebuild electron in $PROJECT_ROOT, then relaunch."
  print "[1/3] 正在修复桌面运行组件，请稍候…"
  npm rebuild electron --foreground-scripts \
    || fail "Electron 运行组件修复失败。请检查网络连接后重新打开。"
  electron_runtime_ready || fail "Electron runtime is incomplete. Run npm rebuild electron in $PROJECT_ROOT, then relaunch."
fi

export MEDIA_DOCK_V3_PREVIEW="1"

if [[ "${MEDIA_DOCK_SKIP_BUILD:-0}" != "1" ]]; then
  command -v npm >/dev/null 2>&1 || fail "npm is required to build the local preview."
  cd "$PROJECT_ROOT"
  print "[2/3] 正在准备 Media Dock 界面…"
  npm run build || fail "构建失败，应用尚未启动。请保留上方错误信息以便诊断。"
fi

[[ -f "$PROJECT_ROOT/dist/index.html" ]] || fail "The web build is missing. Run npm run build first."
[[ -f "$PROJECT_ROOT/dist-electron/main.js" ]] || fail "The Electron build is missing. Run npm run build first."

print "Media Dock 3 Preview launcher is ready."
print "Project root: $PROJECT_ROOT"
print "Electron: $ELECTRON_BIN"
print "Data boundary: Media Dock Data/v3"
print "[3/3] 正在打开 Media Dock…"

if [[ "${MEDIA_DOCK_LAUNCHER_DRY_RUN:-0}" == "1" ]]; then
  exit 0
fi

cd "$PROJECT_ROOT"
zsystem flock -u "$MEDIA_DOCK_LAUNCH_LOCK_FD"
exec "$ELECTRON_BIN" "$PROJECT_ROOT"
