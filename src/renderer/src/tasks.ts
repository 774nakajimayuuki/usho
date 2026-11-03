import type { QueueEntry, Task } from '../../shared/types'

/** How many agents run at once. More than this gets hard to keep track of. */
export const SLOT_COUNT = 6

export type QueuedTask = Task & { queue: QueueEntry }

// Agents sitting idle in a slot cost the most, then stopped work, then things that can wait
function waitRank(task: Task): number {
  if (task.slot !== null) return 0
  return task.level === 'problem' ? 1 : 2
}

/** The Needs you queue, most costly wait first. */
export function needsYou(tasks: Task[]): QueuedTask[] {
  return tasks
    .filter((task): task is QueuedTask => task.queue !== undefined)
    .sort((a, b) => waitRank(a) - waitRank(b) || b.queue.waitingMinutes - a.queue.waitingMinutes)
}

export type TaskAction = { type: 'allow' | 'deny'; id: string }

/** Answers an approval. There are no real agents yet, so this only updates the sample task. */
export function tasksReducer(tasks: Task[], action: TaskAction): Task[] {
  return tasks.map((task) => {
    if (task.id !== action.id || task.decision.kind !== 'approval') return task
    const { command } = task.decision
    const allowed = action.type === 'allow'
    return {
      ...task,
      level: 'neutral',
      queue: undefined,
      decision: { kind: 'none' },
      status: allowed ? `Running ${command}` : 'Looking for another way',
      time: 'active just now',
      since: [...task.since, allowed ? `You allowed ${command}` : `You denied ${command}`]
    }
  })
}
