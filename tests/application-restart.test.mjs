import assert from 'node:assert/strict'
import test from 'node:test'
import { createApplicationRestarter } from '../dist-electron/core/applicationRestart.js'

for (const reason of ['tasks-active', 'operation-active']) {
  test(`application restart preserves active work when ${reason}`, async () => {
    const restart = createApplicationRestarter({
      getBlockReason: () => reason,
      confirm: async () => assert.fail('Blocked work must not open confirmation'),
      relaunch: () => assert.fail('Blocked work must not relaunch'),
      quit: () => assert.fail('Blocked work must not quit'),
    })
    assert.deepEqual(await restart('zh-CN'), { status: 'blocked', reason })
  })
}

test('cancelling restart keeps the application usable and permits a later confirmed restart', async () => {
  let confirmed = false
  const calls = []
  const restart = createApplicationRestarter({
    getBlockReason: () => null,
    confirm: async (language) => { calls.push(language); return confirmed },
    relaunch: () => calls.push('relaunch'),
    quit: () => calls.push('quit'),
  })
  assert.deepEqual(await restart('zh-CN'), { status: 'cancelled' })
  confirmed = true
  assert.deepEqual(await restart('en'), { status: 'restarting' })
  assert.deepEqual(calls, ['zh-CN', 'en', 'relaunch', 'quit'])
  assert.deepEqual(await restart('en'), { status: 'blocked', reason: 'operation-active' })
  assert.equal(calls.filter((call) => call === 'relaunch').length, 1)
})

test('restart rechecks work after confirmation and ignores concurrent restart requests', async () => {
  let resolveConfirmation
  let blocked = null
  const restart = createApplicationRestarter({
    getBlockReason: () => blocked,
    confirm: () => new Promise((resolve) => { resolveConfirmation = resolve }),
    relaunch: () => assert.fail('Work began while the dialog was open'),
    quit: () => assert.fail('Active work must survive'),
  })
  const first = restart('zh-CN')
  assert.deepEqual(await restart('zh-CN'), { status: 'blocked', reason: 'operation-active' })
  blocked = 'tasks-active'
  resolveConfirmation(true)
  assert.deepEqual(await first, { status: 'blocked', reason: 'tasks-active' })
})

test('a failed relaunch leaves the current app running and allows retry', async () => {
  let fails = true
  let quitCount = 0
  const restart = createApplicationRestarter({
    getBlockReason: () => null,
    confirm: async () => true,
    relaunch: () => { if (fails) throw new Error('Cannot relaunch') },
    quit: () => { quitCount += 1 },
  })
  await assert.rejects(restart('en'), /Cannot relaunch/)
  assert.equal(quitCount, 0)
  fails = false
  assert.deepEqual(await restart('en'), { status: 'restarting' })
  assert.equal(quitCount, 1)
})
