import type { Ref } from 'react'
import type { Task } from '../../../shared/types'
import { describeStage, formatConfig } from '../format'
import { DecisionCard } from './DecisionCard'

interface TaskDetailProps {
  task: Task
  onAllow: () => void
  onDeny: () => void
  ref?: Ref<HTMLElement>
}

export function TaskDetail({ task, onAllow, onDeny, ref }: TaskDetailProps) {
  return (
    <section ref={ref} className="detail" aria-labelledby="detail-title" tabIndex={-1}>
      <div>
        <div className="detail-meta">
          <span>{task.slot ? `Slot ${task.slot}` : 'Not in a slot'}</span>
          <span aria-hidden="true">·</span>
          <span className="mono">{task.issue ?? 'Quick task'}</span>
          <span aria-hidden="true">·</span>
          <span className="chip">{formatConfig(task.config, true)}</span>
        </div>
        <h2 id="detail-title">{task.title}</h2>
        <p className="detail-stage">{describeStage(task)}</p>
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

      <DecisionCard task={task} onAllow={onAllow} onDeny={onDeny} />

      <button type="button" className="btn align-start">
        Show full log
      </button>
    </section>
  )
}
