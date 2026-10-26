import AppKit
import Darwin

final class Launcher: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private var preparation: Process?
    private var log: FileHandle?

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            let resources = Bundle.main.resourceURL!
            let relative = try String(contentsOf: resources.appendingPathComponent("project-relative-path.txt"), encoding: .utf8)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let project = Bundle.main.bundleURL.deletingLastPathComponent().appendingPathComponent(relative).standardizedFileURL
            let script = project.appendingPathComponent("scripts/launch-mac-v3-preview.sh")
            guard FileManager.default.fileExists(atPath: script.path) else {
                throw NSError(domain: "MediaDockLauncher", code: 1, userInfo: [NSLocalizedDescriptionKey: "找不到项目，请把启动入口和项目文件夹保持在原来的相对位置。"])
            }
            if let executable = try? runtime(in: project),
               let running = NSWorkspace.shared.runningApplications.first(where: { $0.executableURL?.standardizedFileURL == executable }) {
                running.activate(options: [.activateAllWindows, .activateIgnoringOtherApps])
                Darwin.exit(0)
            }
            showProgress()
            let logDirectory = project.appendingPathComponent("output/launcher")
            try FileManager.default.createDirectory(at: logDirectory, withIntermediateDirectories: true)
            let logURL = logDirectory.appendingPathComponent("startup.log")
            FileManager.default.createFile(atPath: logURL.path, contents: Data(), attributes: [.posixPermissions: 0o600])
            log = try FileHandle(forWritingTo: logURL)
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/bin/zsh")
            process.arguments = [script.path]
            process.currentDirectoryURL = project
            var environment = ProcessInfo.processInfo.environment
            environment["MEDIA_DOCK_PREPARE_ONLY"] = "1"
            process.environment = environment
            process.standardInput = FileHandle.nullDevice
            process.standardOutput = log
            process.standardError = log
            process.terminationHandler = { [weak self] finished in
                DispatchQueue.main.async {
                    guard let self = self else { return }
                    self.log?.closeFile()
                    self.log = nil
                    if finished.terminationStatus != 0 {
                        self.fail("准备未完成（退出码 \(finished.terminationStatus)）。请查看启动日志：\n\(logURL.path)")
                        return
                    }
                    do { try self.start(project: project) }
                    catch { self.fail(error.localizedDescription) }
                }
            }
            preparation = process
            try process.run()
        } catch { fail(error.localizedDescription) }
    }

    private func runtime(in project: URL) throws -> URL {
        let package = project.appendingPathComponent("node_modules/electron")
        let relative = try String(contentsOf: package.appendingPathComponent("path.txt"), encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let directory = package.appendingPathComponent("dist")
        let executable = directory.appendingPathComponent(relative).standardizedFileURL
        guard executable.path.hasPrefix(directory.path + "/"), FileManager.default.isExecutableFile(atPath: executable.path) else {
            throw NSError(domain: "MediaDockLauncher", code: 2, userInfo: [NSLocalizedDescriptionKey: "桌面运行组件不完整，请查看启动日志。"])
        }
        return executable
    }

    private func start(project: URL) throws {
        let executable = try runtime(in: project)
        window?.orderOut(nil)
        setenv("MEDIA_DOCK_V3_PREVIEW", "1", 1)
        // Replace this launcher with Electron; no shell, Node wrapper or helper remains.
        // Runtime output is not appended to the preparation log.
        let null = Darwin.open("/dev/null", O_RDWR)
        if null >= 0 {
            for descriptor in [STDIN_FILENO, STDOUT_FILENO, STDERR_FILENO] { dup2(null, descriptor) }
            if null > STDERR_FILENO { Darwin.close(null) }
        }
        var arguments = [executable.path, project.path].map { strdup($0) } + [nil]
        arguments.withUnsafeMutableBufferPointer { buffer in
            executable.path.withCString { _ = execv($0, buffer.baseAddress!) }
        }
        let message = String(cString: strerror(errno))
        arguments.forEach { free($0) }
        throw NSError(domain: "MediaDockLauncher", code: 3, userInfo: [NSLocalizedDescriptionKey: "无法打开 Media Dock：\(message)"])
    }

    private func showProgress() {
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 420, height: 136), styleMask: [.titled], backing: .buffered, defer: false)
        window.title = "正在准备 Media Dock"
        let spinner = NSProgressIndicator(frame: NSRect(x: 24, y: 57, width: 26, height: 26))
        spinner.style = .spinning
        spinner.startAnimation(nil)
        let label = NSTextField(wrappingLabelWithString: "正在检查依赖和构建界面…\n完成后会自动打开，首次准备可能需要稍等。")
        label.frame = NSRect(x: 68, y: 40, width: 328, height: 58)
        label.font = .systemFont(ofSize: 13)
        window.contentView?.addSubview(spinner)
        window.contentView?.addSubview(label)
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        self.window = window
    }

    private func fail(_ message: String) {
        window?.orderOut(nil)
        let alert = NSAlert()
        alert.messageText = "Media Dock 未能启动"
        alert.informativeText = message
        alert.addButton(withTitle: "关闭")
        NSApp.activate(ignoringOtherApps: true)
        alert.runModal()
        Darwin.exit(1)
    }
}

let application = NSApplication.shared
let launcher = Launcher()
application.setActivationPolicy(.accessory)
application.delegate = launcher
application.run()
