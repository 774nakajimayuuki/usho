import type { Decision, QueueEntry, Task, TaskRecord } from '../../shared/types'
import { plural, timeAgo } from './format'

export type QueuedTask = Task & { queue: QueueEntry }

/** A running agent that prints nothing for this long is probably stuck. */
const STALL_MINUTES = 5

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

/** A few words on where a task stands, for places too small for the whole board view. */
export function shortState(record: TaskRecord): string {
  const slot = record.slot === null ? '' : `Slot ${record.slot} · `
  switch (record.run?.state) {
    case undefined:
      return record.slot === null ? 'Waiting for a slot' : `${slot}starting`
    case 'starting':
    case 'running':
      return `${slot}working`
    case 'needs-approval':
      return `${slot}needs you`
    case 'finished':
      return 'Finished'
    case 'failed':
      return 'Failed'
    case 'stopped':
      return 'Stopped'
    case 'unsupported':
      return 'Not connected'
  }
}

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// A rough guide, shown next to the command; you still read the command itself
function approvalRisk(commands: string[]): Pick<Extract<Decision, { kind: 'approval' }>, 'risk' | 'riskLevel'> {
  const risky = /\b(rm|sudo|curl|wget|chmod|chown|mv|npm\s+publish|git\s+(push|reset|clean|checkout|rebase))\b/
  const readOnly = /^(ls|cat|head|tail|wc|grep|rg|find|git\s+(status|diff|log|show)|npm\s+(test|run\s+(test|lint|typecheck)))\b/
  if (commands.some((c) => risky.test(c))) return { risk: 'Can change or delete things · check carefully', riskLevel: 'high' }
  if (commands.every((c) => readOnly.test(c))) return { risk: 'Usually safe · reads files or runs tests', riskLevel: 'low' }
  return { risk: 'Check what it does before allowing', riskLevel: 'check' }
}

/**
 * How a saved task looks on the board.
 * `seen` is how many activity steps you had seen when you last left the task.
 */
export function toBoardTask(record: TaskRecord, now: number, seen: number | undefined): Task {
  const run = record.run
  const agent = record.config.agent
  const activity = run?.activity ?? []
  const fresh = activity.slice(seen ?? 0)
  const minutes = run ? Math.max(0, Math.floor((now - Date.parse(run.lastEventAt)) / 60_000)) : 0
  const holding = record.slot === null ? 'slot freed' : `holding slot ${record.slot}`

  const task: Task = {
    id: record.id,
    repo: record.repo,
    issue: record.issue ? `#${record.issue.number}` : null,
    title: record.issue?.title ?? 'Quick task',
    config: record.config,
    stage: record.issue ? (run ? 'develop' : 'design') : null,
    slot: record.slot,
    branch: record.branch,
    canStop: run?.state === 'starting' || run?.state === 'running',
    level: 'neutral',
    status: run?.current ?? (record.slot === null ? 'Waiting for a free slot' : 'Starting'),
    time: run ? `active ${timeAgo(run.lastEventAt, now)}` : `created ${timeAgo(record.createdAt, now)}`,
    lastLook: seen === undefined ? 'not opened yet' : plural(fresh.length, 'new step'),
    since:
      activity.length === 0
        ? [`Created the branch ${record.branch} and its worktree`]
        : fresh.length > 0
          ? fresh.slice(-8).map((step) => `${clock(step.at)} ${step.text}`)
          : ['Nothing new'],
    next: run
      ? `${agent} keeps working. Anything it would normally ask permission for comes to you first.`
      : 'Starts as soon as a slot is free.',
    decision: { kind: 'none' }
  }
  if (!run) return task

  switch (run.state) {
    case 'running':
      if (minutes < STALL_MINUTES) return task
      return {
        ...task,
        level: 'problem',
        status: `No output for ${minutes} min`,
        time: `quiet ${minutes}m`,
        queue: { reason: 'No output', cost: `${agent} quiet for ${minutes} min · ${holding}`, action: 'Check', waitingMinutes: minutes },
        next: `${agent} may be stuck, or still running something long.`,
        decision: { kind: 'stalled', tail: activity.slice(-3).map((step) => step.text).join('\n') }
      }

    case 'needs-approval': {
      const commands = run.approvals.map((a) => a.detail)
      return {
        ...task,
        level: 'attention',
        status: `Needs you: ${run.current}`,
        time: `idle ${minutes}m`,
        queue: {
          reason: 'Wants approval',
          cost: `${agent} idle for ${minutes} min · ${holding}`,
          action: 'Review',
          waitingMinutes: minutes
        },
        next: `Allow it, and ${agent} runs it and carries on. Deny it, and ${agent} carries on without it.`,
        decision: { kind: 'approval', command: commands.join('\n'), ...approvalRisk(commands) }
      }
    }

    case 'finished':
      return {
        ...task,
        level: 'attention',
        status: 'Finished',
        time: `${timeAgo(run.lastEventAt, now)}`,
        queue: { reason: 'Result ready', cost: `Finished ${timeAgo(run.lastEventAt, now)}`, action: 'Read', waitingMinutes: minutes },
        next: 'Look at the changes in the worktree. Making a draft PR from them is the next step for Usho itself.',
        decision: { kind: 'result', text: run.message ?? 'Finished without a summary.' }
      }

    case 'failed':
      return {
        ...task,
        level: 'problem',
        status: run.current,
        time: `${timeAgo(run.lastEventAt, now)}`,
        queue: { reason: 'Failed', cost: `Stopped ${timeAgo(run.lastEventAt, now)} · ${holding}`, action: 'Open', waitingMinutes: minutes },
        next: 'Open the worktree to look at what it did, or discard the task.',
        decision: { kind: 'failed', error: run.message ?? 'No error message.' }
      }

    case 'stopped':
    case 'unsupported':
      return { ...task, status: run.message ?? run.current, next: 'Nothing more will happen to this task.' }

    default:
      return task
  }
}
