import { useState } from 'react'
import type { Issue, Preset, RepoInfo, TaskRecord } from '../../../shared/types'
import { formatConfig, timeAgo } from '../format'
import { shortState } from '../tasks'
import type { IssuesState } from '../useRepo'

interface OpenIssuesProps {
  repo: RepoInfo | null
  state: IssuesState
  tasks: TaskRecord[]
  preset: Preset
  onChooseRepo: () => void
  onRefresh: () => void
  onStart: (issue: Issue) => Promise<void>
  onSelectTask: (id: string) => void
}

export function OpenIssues({ repo, state, onRefresh, ...rest }: OpenIssuesProps) {
  return (
    <div className="parked">
      <div className="parked-title">
        Open issues
        <span className="parked-title-end">
          {state.status === 'loaded' && <span className="muted">{state.issues.length}</span>}
          {repo && (
            <button type="button" className="link-btn" onClick={onRefresh} disabled={state.status === 'loading'}>
              Refresh
            </button>
          )}
        </span>
      </div>
      <IssuesBody repo={repo} state={state} {...rest} />
    </div>
  )
}

function IssuesBody({
  repo,
  state,
  tasks,
  preset,
  onChooseRepo,
  onStart,
  onSelectTask
}: Omit<OpenIssuesProps, 'onRefresh'>) {
  const [starting, setStarting] = useState<number | null>(null)

  async function start(issue: Issue): Promise<void> {
    setStarting(issue.number)
    await onStart(issue)
    setStarting(null)
  }

  switch (state.status) {
    case 'loading':
      return <p className="parked-message">Loading issues…</p>

    case 'no-repo':
      return (
        <>
          <p className="parked-message">Choose a local clone of a GitHub repository to see its issues.</p>
          <button type="button" className="btn align-start" onClick={onChooseRepo}>
            Choose repository
          </button>
        </>
      )

    case 'error':
      return (
        <>
          <p className="parked-message is-error">{state.error}</p>
          {!repo && (
            <button type="button" className="btn align-start" onClick={onChooseRepo}>
              Choose repository
            </button>
          )}
        </>
      )

    case 'loaded':
      if (state.issues.length === 0) {
        return <p className="parked-message">No open issues in {repo?.nameWithOwner}.</p>
      }
      return (
        <ul className="issue-list">
          {state.issues.map((issue) => {
            const linked = tasks.filter((t) => t.repo === repo?.nameWithOwner && t.issue?.number === issue.number)
            return (
              <li key={issue.number} className="issue">
                <div className="issue-row">
                  <a
                    className="issue-link"
                    href={issue.url}
                    target="_blank"
                    rel="noreferrer"
                    title={`Updated ${timeAgo(issue.updatedAt)}`}
                  >
                    <span className="mono muted">#{issue.number}</span>
                    <span className="ellipsis">{issue.title}</span>
                  </a>
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => void start(issue)}
                    disabled={starting !== null}
                    title={`Start a task with ${preset.label}: ${formatConfig(preset.config, true)}`}
                  >
                    {starting === issue.number ? 'Starting…' : 'Start'}
                  </button>
                </div>
                {linked.length > 0 && (
                  <div className="issue-tasks">
                    {linked.map((task) => (
                      <button key={task.id} type="button" className="task-chip" onClick={() => onSelectTask(task.id)}>
                        {shortState(task)} · {formatConfig(task.config)}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )
  }
}
