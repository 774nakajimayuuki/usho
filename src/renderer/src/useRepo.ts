import { useCallback, useEffect, useState } from 'react'
import type { Issue, RepoInfo } from '../../shared/types'

export type IssuesState =
  | { status: 'loading' }
  | { status: 'no-repo' }
  | { status: 'error'; error: string }
  | { status: 'loaded'; issues: Issue[] }

/** The chosen repository and its open issues, read through gh in the main process. */
export function useRepo() {
  const [repo, setRepo] = useState<RepoInfo | null>(null)
  const [issues, setIssues] = useState<IssuesState>({ status: 'loading' })

  const refreshIssues = useCallback(async () => {
    setIssues({ status: 'loading' })
    const result = await window.usho.listIssues()
    setIssues(result.ok ? { status: 'loaded', issues: result.value } : { status: 'error', error: result.error })
  }, [])

  useEffect(() => {
    void window.usho.getRepo().then((result) => {
      if (!result.ok) {
        setIssues({ status: 'error', error: result.error })
      } else if (!result.value) {
        setIssues({ status: 'no-repo' })
      } else {
        setRepo(result.value)
        void refreshIssues()
      }
    })
  }, [refreshIssues])

  const chooseRepo = useCallback(async () => {
    const result = await window.usho.chooseRepo()
    if (!result.ok) {
      setIssues({ status: 'error', error: result.error })
      return
    }
    // Cancelled: keep the current repository
    if (!result.value) return
    setRepo(result.value)
    await refreshIssues()
  }, [refreshIssues])

  return { repo, issues, chooseRepo, refreshIssues }
}
