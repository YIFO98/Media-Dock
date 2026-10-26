export type RestartBlockReason = 'tasks-active' | 'operation-active'
export type ApplicationRestartResult = Readonly<
  | { status: 'restarting' | 'cancelled' }
  | { status: 'blocked'; reason: RestartBlockReason }
>

export function createApplicationRestarter(options: Readonly<{
  getBlockReason(): RestartBlockReason | null
  confirm(language: 'zh-CN' | 'en'): Promise<boolean>
  relaunch(): void
  quit(): void
}>) {
  let pending = false
  return async (language: 'zh-CN' | 'en'): Promise<ApplicationRestartResult> => {
    if (pending) return { status: 'blocked', reason: 'operation-active' }
    const blocked = options.getBlockReason()
    if (blocked) return { status: 'blocked', reason: blocked }
    pending = true
    let scheduled = false
    try {
      if (!await options.confirm(language)) return { status: 'cancelled' }
      // Work can start in another window while the confirmation is open.
      const reason = options.getBlockReason()
      if (reason) return { status: 'blocked', reason }
      options.relaunch()
      scheduled = true
      // Use the existing before-quit cleanup, including the task database.
      options.quit()
      return { status: 'restarting' }
    } finally {
      if (!scheduled) pending = false
    }
  }
}
