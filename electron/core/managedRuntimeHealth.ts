import { closeSync, openSync, readSync } from 'node:fs'
import { dirname } from 'node:path'
import { runRuntimeProcessCollectOutput } from './runtimeProcess.js'
import { getRuntimeUpdateAvailability } from './runtimeExecutable.js'

type ReleaseAsset = { name?: string; browser_download_url?: string; size?: number; digest?: string | null }

export function selectMacosYtDlpAsset(assets: readonly ReleaseAsset[]) {
  const asset = assets.find((candidate) => candidate.name === 'yt-dlp_macos' && candidate.browser_download_url)
  return asset ? {
    name: asset.name!, url: asset.browser_download_url!,
    size: typeof asset.size === 'number' ? asset.size : null, digest: asset.digest ?? null,
  } : null
}

export function isMacosStandaloneExecutable(command: string): boolean {
  let descriptor: number | undefined
  try {
    descriptor = openSync(command, 'r')
    const header = Buffer.alloc(4)
    if (readSync(descriptor, header, 0, 4, 0) !== 4) return false
    return [0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe, 0xbebafeca, 0xcafebabf, 0xbfbafeca].includes(header.readUInt32BE())
  } catch { return false }
  finally { if (descriptor !== undefined) closeSync(descriptor) }
}

export async function inspectManagedRuntimeHealth(
  tool: 'yt-dlp' | 'deno',
  runtime: Readonly<{ command: string; version: string }> | null,
  signal?: AbortSignal,
) {
  if (!runtime) return { currentVersion: null, repairRequired: true }
  // Python wrappers can pass a Terminal probe and fail when launched by Finder.
  if (tool === 'yt-dlp' && !isMacosStandaloneExecutable(runtime.command)) {
    return { currentVersion: runtime.version, repairRequired: true }
  }
  try {
    const result = await runRuntimeProcessCollectOutput({
      command: runtime.command, args: tool === 'yt-dlp' ? ['--ignore-config', '--version'] : ['--version'], timeoutMs: 15_000,
      workingDirectory: dirname(runtime.command), env: process.env, signal,
    })
    const version = tool === 'yt-dlp'
      ? result.stdout.trim().match(/^\d{4}\.\d{2}\.\d{2}(?:[\w.-]*)?$/u)?.[0] ?? null
      : result.stdout.match(/^deno\s+(\d+\.\d+\.\d+(?:[\w.-]*)?)/u)?.[1] ?? null
    return { currentVersion: version ?? runtime.version, repairRequired: !version || version !== runtime.version }
  } catch {
    signal?.throwIfAborted()
    return { currentVersion: runtime.version, repairRequired: true }
  }
}

export function runtimeUpdateAvailability(health: Readonly<{ currentVersion: string | null; repairRequired: boolean }>, latestVersion: string | null) {
  const availability = getRuntimeUpdateAvailability(health.currentVersion, latestVersion)
  return {
    updateAvailable: availability.updateAvailable || (health.repairRequired && latestVersion !== null),
    repairRequired: availability.repairRequired || health.repairRequired,
  }
}
