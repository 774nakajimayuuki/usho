import type { RepoInfo } from '../../../shared/types'
import { timeAgo } from '../format'
import type { IssuesState } from '../useRepo'

interface OpenIssuesProps {
  repo: RepoInfo | null
  state: IssuesState
  onChooseRepo: () => void
  onRefresh: () => void
}

export function OpenIssues({ repo, state, onChooseRepo, onRefresh }: OpenIssuesProps) {
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
      <IssuesBody repo={repo} state={state} onChooseRepo={onChooseRepo} />
    </div>
  )
}

function IssuesBody({ repo, state, onChooseRepo }: Omit<OpenIssuesProps, 'onRefresh'>) {
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
          {state.issues.map((issue) => (
            <li key={issue.number}>
              <a className="issue-link" href={issue.url} target="_blank" rel="noreferrer">
                <span className="mono muted">#{issue.number}</span>
                <span className="ellipsis">{issue.title}</span>
              </a>
              <span className="meta">{timeAgo(issue.updatedAt)}</span>
            </li>
          ))}
        </ul>
      )
  }
}
