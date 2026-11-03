import { useState, type Ref } from 'react'
import type { Task } from '../../../shared/types'
import { describeStage, formatConfig } from '../format'
import { DecisionCard } from './DecisionCard'

interface TaskDetailProps {
  task: Task
  onAllow: () => void
  onDeny: () => void
  onStop: () => void
  onOpenWorktree: () => void
  onDiscard: () => void
  ref?: Ref<HTMLElement>
}

export function TaskDetail({ task, onAllow, onDeny, onStop, onOpenWorktree, onDiscard, ref }: TaskDetailProps) {
  return (
    <section ref={ref} className="detail" aria-labelledby="detail-title" tabIndex={-1}>
      <div>
        <div className="detail-meta">
          <span>{task.slot ? `Slot ${task.slot}` : 'Not in a slot'}</span>
          <span aria-hidden="true">·</span>
          <span className="mono">
            {task.repo}
            {task.issue ?? ''}
          </span>
          <span aria-hidden="true">·</span>
          <span className="chip">{formatConfig(task.config, true)}</span>
        </div>
        <h2 id="detail-title">{task.title}</h2>
        <p className="detail-stage">{describeStage(task)}</p>
        {task.branch && <p className="detail-branch mono">{task.branch}</p>}
      </div>

      <div className="detail-grid">
        <div className="panel">
          <h3>
            Since you last looked <span className="muted">· {task.lastLook}</span>
          </h3>
          <ol>
            {task.since.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </div>
        <div className="panel">
          <h3>Likely next</h3>
          <p>{task.next}</p>
        </div>
      </div>

      <DecisionCard task={task} onAllow={onAllow} onDeny={onDeny} onStop={onStop} />

      <TaskActions branch={task.branch} onOpenWorktree={onOpenWorktree} onDiscard={onDiscard} />
    </section>
  )
}

interface TaskActionsProps {
  branch: string | null
  onOpenWorktree: () => void
  onDiscard: () => void
}

// Discarding deletes the branch, so it asks once more in place instead of in a dialog
function TaskActions({ branch, onOpenWorktree, onDiscard }: TaskActionsProps) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="actions confirm" role="group" aria-label="Confirm discard">
        <span className="confirm-text">
          Remove this task, its worktree and the branch <span className="mono">{branch}</span>, with any changes in
          them?
        </span>
        <button type="button" className="btn danger" onClick={onDiscard}>
          Discard task
        </button>
        <button type="button" className="btn" onClick={() => setConfirming(false)}>
          Cancel
        </button>
      </div>
    )
  }
  return (
    <div className="actions">
      <button type="button" className="btn" onClick={onOpenWorktree}>
        Open worktree
      </button>
      <button type="button" className="btn danger" onClick={() => setConfirming(true)}>
        Discard task…
      </button>
    </div>
  )
}

export function EmptyDetail() {
  return (
    <section className="detail">
      <h2>No tasks yet</h2>
      <p className="detail-stage">
        Press Start next to an issue on the left. Each start gets its own branch and worktree, and an agent starts
        working in it. One issue can have several tasks at once.
      </p>
    </section>
  )
}
