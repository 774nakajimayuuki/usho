/** A CLI that Usho drives, and whether it can be run on this machine. */
export interface ToolStatus {
  command: string
  label: string
  installed: boolean
  version: string | null
}

/** Errors cross IPC as values, so the renderer can show gh's own message. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export interface RepoInfo {
  /** The local clone that agents will work in */
  path: string
  nameWithOwner: string
  url: string
}

export interface Issue {
  number: number
  title: string
  url: string
  updatedAt: string
  labels: string[]
}

/** The API the preload script exposes to the renderer as `window.usho`. */
export interface UshoApi {
  checkTools: () => Promise<ToolStatus[]>
  /** The repository chosen earlier, or null if none has been chosen yet */
  getRepo: () => Promise<Result<RepoInfo | null>>
  /** Asks for a local clone. The value is null when the dialog is cancelled. */
  chooseRepo: () => Promise<Result<RepoInfo | null>>
  listIssues: () => Promise<Result<Issue[]>>
}

export type AgentName = 'Claude Code' | 'Codex'

export interface AgentConfig {
  agent: AgentName
  model: string
  effort: string
}

/** A named agent, model and effort combination, so a task can start without three choices. */
export interface Preset {
  id: string
  label: string
  config: AgentConfig
}

/**
 * Whose move it is. These are the only status colors in the UI:
 * `attention` is your turn, `problem` is something wrong, `neutral` is everything else.
 */
export type Level = 'attention' | 'problem' | 'neutral'

export type Stage = 'design' | 'develop' | 'self-review' | 'ai-review' | 'peer-review'

/** What the task is waiting on you to decide, if anything. */
export type Decision =
  | { kind: 'approval'; command: string; risk: string }
  | { kind: 'stalled'; tail: string }
  | { kind: 'failed'; error: string }
  | { kind: 'review'; pr: string; files: { path: string; diff: string }[] }
  | { kind: 'result'; text: string }
  | { kind: 'none' }

/** Why a task is in the Needs you queue. */
export interface QueueEntry {
  reason: string
  /** What the wait is costing, e.g. "Claude Code idle for 7 min · holding slot 1" */
  cost: string
  action: string
  waitingMinutes: number
}

export interface Task {
  id: string
  /** The GitHub issue, such as "#18", or null for a quick task */
  issue: string | null
  title: string
  config: AgentConfig
  /** Null for quick tasks, which have no development stages */
  stage: Stage | null
  /** The outside tool a quick task uses, such as Slack */
  tool?: string
  /** The agent slot the task holds while its agent is alive */
  slot: number | null
  level: Level
  /** One line on what the agent is doing now */
  status: string
  time: string
  queue?: QueueEntry
  lastLook: string
  since: string[]
  next: string
  decision: Decision
}

/** Tasks that need nothing until something changes, such as a PR waiting for reviewers. */
export interface ParkedGroup {
  label: string
  items: { text: string; meta: string }[]
}
