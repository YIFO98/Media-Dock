import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

/** yt-dlp saves its cookie jar even after a metadata-only request. Never lend
 * it an imported original or a file shared with another runtime process. */
export async function withIsolatedCookieFile<T>(
  sourcePath: string | null | undefined,
  operation: (cookiePath: string | null) => Promise<T>,
): Promise<T> {
  if (!sourcePath) return await operation(null)
  const directory = await mkdtemp(path.join(tmpdir(), 'media-dock-cookie-'))
  try {
    const snapshot = await readFile(sourcePath)
    const cookiePath = path.join(directory, 'cookies.txt')
    await writeFile(cookiePath, snapshot, { mode: 0o600, flag: 'wx' })
    return await operation(cookiePath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}
