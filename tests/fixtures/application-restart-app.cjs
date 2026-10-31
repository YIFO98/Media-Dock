const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { app, dialog } = require('electron')

const root = process.env.MEDIA_DOCK_RESTART_TEST_ROOT
if (!root) throw new Error('An isolated restart test root is required')
process.env.MEDIA_DOCK_PORTABLE_ROOT = root
// EXIT_PROBE also selects a headless startup path; enable it only after boot.
delete process.env.MEDIA_DOCK_EXIT_PROBE
const reportPath = path.join(root, 'restart-result.json')
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : { launches: [] }
report.launches.push({ pid: process.pid, cwd: process.cwd() })
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report))
save()

function fail(error) {
  report.error = String(error.stack ?? error)
  save()
  app.exit(1)
}
const timeout = setTimeout(() => fail(new Error('Native restart timed out')), 30000)
app.on('will-quit', () => clearTimeout(timeout))
dialog.showErrorBox = (title, content) => fail(new Error(`${title}: ${content}`))
let confirmationCount = 0
dialog.showMessageBox = async (_window, options) => {
  assert.equal(options.defaultId, 0)
  assert.equal(options.cancelId, 0)
  assert.deepEqual(options.buttons, ['取消', '重启应用'])
  confirmationCount += 1
  return { response: confirmationCount === 1 ? 0 : 1, checkboxChecked: false }
}
let handled = false
app.on('browser-window-created', (_event, window) => {
  window.webContents.on('did-finish-load', async () => {
    if (handled || !window.webContents.getURL().endsWith('#v3')) return
    handled = true
    try {
      const workspace = await window.webContents.executeJavaScript('window.mediaDock.getWorkspaceSnapshot()')
      assert.equal(workspace.tasks.length, 0)
      if (report.launches.length === 1) {
        report.userData = app.getPath('userData')
        await window.webContents.executeJavaScript("localStorage.setItem('restart-fixture', 'preserved')")
        let restartResult
        for (let attempt = 0; attempt < 100; attempt += 1) {
          restartResult = await window.webContents.executeJavaScript("window.mediaDock.restartApplication('zh-CN')")
          if (restartResult.status !== 'blocked') break
          assert.equal(restartResult.reason, 'operation-active', 'Only the initial runtime health check may block this empty workspace')
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
        assert.deepEqual(restartResult, { status: 'cancelled' })
        report.cancelVerified = true
        save()
        process.env.MEDIA_DOCK_EXIT_PROBE = '1'
        // The window can disappear before its IPC promise settles.
        void window.webContents.executeJavaScript("window.mediaDock.restartApplication('zh-CN')").catch(() => {})
      } else {
        assert.equal(report.launches.length, 2, 'Restart must open exactly one new instance')
        assert.equal(app.getPath('userData'), report.userData)
        assert.equal(report.launches[0].cwd, process.cwd())
        assert.notEqual(report.launches[0].pid, process.pid)
        assert.equal(await window.webContents.executeJavaScript("localStorage.getItem('restart-fixture')"), 'preserved')
        const cleanup = JSON.parse(fs.readFileSync(path.join(root, 'Media Dock Data', 'exit-probe.json'), 'utf8'))
        assert.equal(cleanup.taskEngineClosed, true)
        assert.equal(cleanup.ipcUnregistered, true)
        report.cleanupVerified = true
        report.reopened = true
        save()
        app.quit()
      }
    } catch (error) { fail(error) }
  })
})
app.whenReady().then(async () => {
  await import(pathToFileURL(path.resolve(__dirname, '../../dist-electron/main.js')).href)
}).catch(fail)
