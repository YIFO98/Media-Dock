import assert from 'node:assert/strict'
import test from 'node:test'
import { assertSafeLocalPath } from '../dist-electron/core/localPath.js'

const existingPath = () => true

test('accepts macOS absolute paths with spaces, Unicode, and mounted volumes', () => {
  for (const targetPath of ['/Users/xiaofu/Downloads', '/Users/xiaofu/中文 素材', '/Volumes/Media Drive/电影']) {
    assert.equal(assertSafeLocalPath(targetPath, { pathExists: existingPath }), targetPath)
  }
})

test('rejects URLs, relative paths, empty paths, and null bytes', () => {
  const cases = [
    ['https://example.com/file', /Only local filesystem paths/],
    ['file:///Users/xiaofu', /Only local filesystem paths/],
    ['relative/folder', /Only absolute filesystem paths/],
    ['', /Path is required/],
    ['/safe\0unsafe', /invalid character/],
  ]
  for (const [targetPath, expected] of cases) {
    assert.throws(() => assertSafeLocalPath(targetPath, { pathExists: existingPath }), expected)
  }
})

test('rejects an absolute path that does not exist', () => {
  assert.throws(() => assertSafeLocalPath('/missing', { pathExists: () => false }), /Path does not exist/)
})
