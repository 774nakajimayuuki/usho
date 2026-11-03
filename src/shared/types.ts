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
  defaultBranch: string
}

export interface Issue {
  number: number
  title: string
  url: string
  updatedAt: string
  labels: string[]
}

/** The part of an issue a task keeps, so it still makes sense if the issue changes. */
export interface IssueRef {
  number: number
  title: string
  url: string
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

/** How many agents run at once. More than this gets hard to keep track of. */
export const SLOT_COUNT = 6

export type AgentState = 'starting' | 'running' | 'needs-approval' | 'finished' | 'failed' | 'stopped' | 'unsupported'

/** Something the agent tried and is not allowed to do yet. */
export interface PendingApproval {
  tool: string
  /** What the agent wanted to do, shown to you as is, such as a shell command */
  detail: string
  /** The permission rule that allows exactly this, given to the agent when you allow it */
  rule: string
}

/** The agent's work on a task, updated from its output as it runs. */
export interface AgentRun {
  state: AgentState
  /** Lets the agent continue the same conversation, such as after an approval */
  sessionId: string | null
  /** What the agent is doing now, in one line */
  current: string
  activity: { at: string; text: string }[]
  startedAt: string
  lastEventAt: string
  approvals: PendingApproval[]
  /** The agent's final message, or why it stopped */
  message: string | null
  costUsd: number
}

/**
 * A task saved by the main process. A task belongs to at most one issue, and an issue can
 * have any number of tasks, each on its own branch and worktree.
 */
export interface TaskRecord {
  id: string
  repo: string
  repoPath: string
  /** Null for a quick task that is not about an issue */
  issue: IssueRef | null
  config: AgentConfig
  branch: string
  worktreePath: string
  /** The agent slot the task holds, or null while it waits for one or after its agent is done */
  slot: number | null
  createdAt: string
  /** Missing until the agent starts */
  run?: AgentRun
}

/** The API the preload script exposes to the renderer as `window.usho`. */
export interface UshoApi {
  checkTools: () => Promise<ToolStatus[]>
  /** The repository chosen earlier, or null if none has been chosen yet */
  getRepo: () => Promise<Result<RepoInfo | null>>
  /** Asks for a local clone. The value is null when the dialog is cancelled. */
  chooseRepo: () => Promise<Result<RepoInfo | null>>
  listIssues: () => Promise<Result<Issue[]>>
  listTasks: () => Promise<Result<TaskRecord[]>>
  /** Creates a task for an issue in the current repository, with its own branch and worktree */
  startTask: (issue: IssueRef, config: AgentConfig) => Promise<Result<TaskRecord>>
  /** Stops the agent if it runs, then removes the task together with its worktree and branch */
  discardTask: (id: string) => Promise<Result<null>>
  openWorktree: (id: string) => Promise<Result<null>>
  /** Answers what the agent is waiting for: run it, or continue without it */
  answerApproval: (id: string, allow: boolean) => Promise<Result<null>>
  stopAgent: (id: string) => Promise<Result<null>>
  /** Calls back whenever a task changes in the main process. Returns a function that unsubscribes. */
  onTasksChanged: (callback: () => void) => () => void
}

/**
 * Whose move it is. These are the only status colors in the UI:
 * `attention` is your turn, `problem` is something wrong, `neutral` is everything else.
 */
export type Level = 'attention' | 'problem' | 'neutral'

export type Stage = 'design' | 'develop' | 'self-review' | 'ai-review' | 'peer-review'

/** What the task is waiting on you to decide, if anything. */
export type Decision =
  | { kind: 'approval'; command: string; risk: string; riskLevel: 'low' | 'check' | 'high' }
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

/** A task as the board shows it. */
export interface Task {
  id: string
  repo: string
  /** The GitHub issue, such as "#18", or null for a quick task */
  issue: string | null
  title: string
  config: AgentConfig
  /** Null for quick tasks, which have no development stages */
  stage: Stage | null
  /** The outside tool a quick task uses, such as Slack */
  tool?: string
  slot: number | null
  branch: string | null
  /** Whether an agent is running that can be stopped */
  canStop: boolean
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
