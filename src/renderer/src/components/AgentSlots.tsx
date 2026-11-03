import { SLOT_COUNT, type Task } from '../../../shared/types'
import { cx, formatConfig, STAGES, stageIndex } from '../format'
import { modKey } from '../useShortcuts'

interface AgentSlotsProps {
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
}

// Each task keeps the same slot until it finishes, so you can find it by where it is
export function AgentSlots({ tasks, selectedId, onSelect }: AgentSlotsProps) {
  const slotNumbers = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1)
  const busy = tasks.filter((task) => task.slot !== null).length

  return (
    <section aria-labelledby="slots-title">
      <div className="section-head">
        <h2 id="slots-title">
          Agents{' '}
          <span className="muted">
            {busy} of {SLOT_COUNT} slots
          </span>
        </h2>
        <span className="hint">
          A task keeps its slot until it finishes · <kbd>{modKey}1</kbd>–<kbd>{modKey + SLOT_COUNT}</kbd> jump to a
          slot
        </span>
      </div>
      <div className="slots">
        {slotNumbers.map((n) => {
          const task = tasks.find((t) => t.slot === n)
          if (!task) {
            return (
              <div key={n} className="slot is-empty">
                Slot {n} is free
              </div>
            )
          }
          return <SlotCard key={n} task={task} selected={task.id === selectedId} onSelect={onSelect} />
        })}
      </div>
    </section>
  )
}

interface SlotCardProps {
  task: Task
  selected: boolean
  onSelect: (id: string) => void
}

function SlotCard({ task, selected, onSelect }: SlotCardProps) {
  return (
    <button
      type="button"
      className={cx('slot', `level-${task.level}`, selected && 'is-selected')}
      onClick={() => onSelect(task.id)}
    >
      <span className="slot-top">
        <span className="slot-num">{task.slot}</span>
        <span className="mono muted">{task.issue ?? 'Quick'}</span>
        <span className="slot-agent">{formatConfig(task.config)}</span>
      </span>
      <span className="slot-title">{task.title}</span>
      <StageLine task={task} />
      <span className="slot-status">
        <span className="dot" />
        <span className="ellipsis">{task.status}</span>
        <span className="slot-time">{task.time}</span>
      </span>
    </button>
  )
}

function StageLine({ task }: { task: Task }) {
  if (task.stage === null) return <span className="stage">Quick task · {task.tool}</span>
  const current = stageIndex(task.stage)
  return (
    <span className="stage">
      <span className="segments" aria-hidden="true">
        {STAGES.map((stage, i) => (
          <span key={stage.id} className={cx(i <= current && 'is-on')} />
        ))}
      </span>
      {STAGES[current].label}
    </span>
  )
}
