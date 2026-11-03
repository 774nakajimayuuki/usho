import type { Task } from '../../../shared/types'
import { cx } from '../format'

interface DecisionCardProps {
  task: Task
  onAllow: () => void
  onDeny: () => void
  onStop: () => void
}

/** What the selected task needs from you, in the colors of its level. */
export function DecisionCard({ task, onAllow, onDeny, onStop }: DecisionCardProps) {
  const { decision } = task
  const agent = task.config.agent

  switch (decision.kind) {
    case 'approval':
      return (
        <div className="decision level-attention">
          <div className="decision-title">
            {agent} is waiting for you
            <span className={cx('risk', `is-${decision.riskLevel}`)}>{decision.risk}</span>
          </div>
          <pre className="code">{decision.command}</pre>
          <div className="actions">
            <button type="button" className="btn primary" onClick={onAllow}>
              Allow once <kbd>A</kbd>
            </button>
            <button type="button" className="btn danger" onClick={onDeny}>
              Deny <kbd>D</kbd>
            </button>
          </div>
        </div>
      )

    case 'stalled':
      return (
        <div className="decision level-problem">
          <div className="decision-title">No output from {agent} for a while</div>
          <pre className="code">{decision.tail}</pre>
          <div className="actions">
            <button type="button" className="btn danger" onClick={onStop}>
              Stop the agent
            </button>
          </div>
        </div>
      )

    case 'failed':
      return (
        <div className="decision level-problem">
          <div className="decision-title">{agent} stopped</div>
          <pre className="code">{decision.error}</pre>
        </div>
      )

    case 'review':
      return (
        <div className="decision level-attention">
          <div className="decision-title">Draft PR {decision.pr} is ready for you</div>
          <ul className="files">
            {decision.files.map((file) => (
              <li key={file.path}>
                <span className="ellipsis">{file.path}</span>
                <span className="diff">{file.diff}</span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'result':
      return (
        <div className="decision level-attention">
          <div className="decision-title">Result ready</div>
          <div className="result">{decision.text}</div>
          <div className="actions">
            <button type="button" className="btn primary" onClick={() => void navigator.clipboard.writeText(decision.text)}>
              Copy
            </button>
          </div>
        </div>
      )

    case 'none':
      return (
        <div className="decision is-calm">
          <span className="calm-text">Nothing needed from you right now. Now: {task.status}</span>
          {task.canStop && (
            <button type="button" className="btn danger" onClick={onStop}>
              Stop
            </button>
          )}
        </div>
      )
  }
}
