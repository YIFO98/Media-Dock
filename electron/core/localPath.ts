import { existsSync } from 'node:fs'
import { isAbsolute } from 'node:path'

type SafeLocalPathOptions = {
  pathExists?: (targetPath: string) => boolean
}

export function assertSafeLocalPath(value: string, options: SafeLocalPathOptions = {}) {
  const targetPath = String(value ?? '').trim()
  const pathExists = options.pathExists ?? existsSync

  if (!targetPath) {
    throw new Error('Path is required.')
  }
  if (targetPath.includes('\0')) {
    throw new Error('Path contains an invalid character.')
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(targetPath)) {
    throw new Error('Only local filesystem paths can be opened.')
  }
  if (!isAbsolute(targetPath)) {
    throw new Error('Only absolute filesystem paths can be opened.')
  }
  if (!pathExists(targetPath)) {
    throw new Error(`Path does not exist: ${targetPath}`)
  }
  return targetPath
}
