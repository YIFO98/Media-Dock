import type { ProblemSnapshot } from './mediaTaskEngine.js'

export const PYTHON_RUNTIME_PROBLEM = 'runtime.yt-dlp-python-unsupported'

export function runtimeProblemFromEvidence(evidence: unknown, stage: 'preparing' | 'acquiring' = 'preparing'): ProblemSnapshot | null {
  const message = evidence instanceof Error ? evidence.message : String(evidence)
  if (!message.includes(PYTHON_RUNTIME_PROBLEM)
    && !/unsupported version of Python|Only Python versions? [\d.]+ and above are supported by yt-dlp/iu.test(message)) return null
  return Object.freeze({
    code: PYTHON_RUNTIME_PROBLEM, category: 'runtime', stage,
    titleKey: 'problem.runtimePythonUnsupported.title', summaryKey: 'problem.runtimePythonUnsupported.summary',
    actions: Object.freeze([Object.freeze({ id: 'repair-runtime', kind: 'repair-runtime' as const })]),
  })
}

export function assertRuntimeAvailable(evidence: unknown): void {
  const problem = runtimeProblemFromEvidence(evidence)
  if (problem) throw new Error(`[${problem.code}] 下载内核与本机 Python 不兼容，请检查并修复运行工具。Repair the download runtime.`)
}
