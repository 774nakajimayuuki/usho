import type { ReactNode } from 'react'
import type { ParkedGroup } from '../../../shared/types'
import { cx } from '../format'
import type { QueuedTask } from '../tasks'

interface NeedsYouProps {
  queue: QueuedTask[]
  parked: ParkedGroup[]
  selectedId: string
  onSelect: (id: string) => void
  onAct: (task: QueuedTask) => void
  /** More parked groups, shown after the sample ones */
  children?: ReactNode
}

export function NeedsYou({ queue, parked, selectedId, onSelect, onAct, children }: NeedsYouProps) {
  return (
    <nav className="needs" aria-label="Needs you">
      <div className="needs-head">
        <h2>
          Needs you <span className="count">{queue.length}</span> <span className="sample-tag">Sample data</span>
        </h2>
        <span className="hint">Longest blocked first</span>
      </div>
      <p className="keys">
        <span>
          <kbd>J</kbd> <kbd>K</kbd> move
        </span>
        <span>
          <kbd>A</kbd> allow
        </span>
        <span>
          <kbd>D</kbd> deny
        </span>
        <span>
          <kbd>↵</kbd> open
        </span>
      </p>

      {queue.length === 0 ? (
        <p className="empty">Nothing needs you right now.</p>
      ) : (
        <ol className="queue">
          {queue.map((task) => (
            <li key={task.id} className={cx('queue-item', task.id === selectedId && 'is-selected')}>
              <button type="button" className="queue-main" onClick={() => onSelect(task.id)}>
                <span className={cx('reason', `level-${task.level}`)}>{task.queue.reason}</span>
                <span className="queue-title ellipsis">
                  {task.issue && <span className="mono muted">{task.issue} </span>}
                  {task.title}
                </span>
                <span className="queue-cost">{task.queue.cost}</span>
              </button>
              <button type="button" className="btn" onClick={() => onAct(task)}>
                {task.queue.action}
              </button>
            </li>
          ))}
        </ol>
      )}

      <h2 className="parked-head">Parked</h2>
      <p className="parked-note">Nothing to do here until something changes.</p>
      {parked.map((group) => (
        <div key={group.label} className="parked">
          <div className="parked-title">
            <span>
              {group.label} <span className="sample-tag">Sample</span>
            </span>
            <span className="muted">{group.items.length}</span>
          </div>
          <ul>
            {group.items.map((item) => (
              <li key={item.text}>
                <span className="ellipsis">{item.text}</span>
                <span className="meta">{item.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {children}
    </nav>
  )
}
