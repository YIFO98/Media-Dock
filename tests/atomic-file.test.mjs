import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { createSiblingTemporaryPath } from '../dist-electron/core/atomicFile.js'

test('temporary runtime candidates stay beside the destination with unique names', () => {
  const target = join('runtime', 'deno')
  const temporaryPath = createSiblingTemporaryPath(target, 'download')
  assert.equal(dirname(temporaryPath), dirname(target))
  assert.match(temporaryPath, /\.download$/)
  assert.notEqual(temporaryPath, target)
  assert.notEqual(createSiblingTemporaryPath(target, 'download'), temporaryPath)
})
