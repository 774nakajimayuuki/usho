import { useCallback, useEffect, useState } from 'react'
import type { AgentConfig, Issue, Result, TaskRecord } from '../../shared/types'

/** The saved tasks, kept up to date as agents work, and the actions that change them. */
export function useTasks() {
  const [records, setRecords] = useState<TaskRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const result = await window.usho.listTasks()
    if (result.ok) setRecords(result.value)
    else setError(result.error)
  }, [])

  useEffect(() => {
    void refresh()
    return window.usho.onTasksChanged(() => void refresh())
  }, [refresh])

  // Runs an action in the main process, shows its error if any, and reloads the tasks
  const act = useCallback(
    async <T>(action: () => Promise<Result<T>>): Promise<T | null> => {
      setError(null)
      const result = await action()
      if (!result.ok) setError(result.error)
      await refresh()
      return result.ok ? result.value : null
    },
    [refresh]
  )

  const start = useCallback(
    (issue: Issue, config: AgentConfig) =>
      act(() => window.usho.startTask({ number: issue.number, title: issue.title, url: issue.url }, config)),
    [act]
  )
  const discard = useCallback((id: string) => act(() => window.usho.discardTask(id)), [act])
  const answer = useCallback((id: string, allow: boolean) => act(() => window.usho.answerApproval(id, allow)), [act])
  const stop = useCallback((id: string) => act(() => window.usho.stopAgent(id)), [act])
  const openWorktree = useCallback((id: string) => act(() => window.usho.openWorktree(id)), [act])
  const dismissError = useCallback(() => setError(null), [])

  return { records, error, start, discard, answer, stop, openWorktree, dismissError }
}
