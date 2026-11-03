import { app, BrowserWindow, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SLOT_COUNT, type AgentConfig, type IssueRef, type Result, type TaskRecord } from '../shared/types'
import { errorText, run } from './exec'
import { getRepo } from './repo'

let tasks: TaskRecord[] | null = null
let saving: Promise<void> = Promise.resolve()

function tasksFile(): string {
  return join(app.getPath('userData'), 'tasks.json')
}

async function load(): Promise<TaskRecord[]> {
  if (!tasks) {
    try {
      tasks = (JSON.parse(await readFile(tasksFile(), 'utf8')) as { tasks: TaskRecord[] }).tasks
    } catch {
      // No tasks saved yet
      tasks = []
    }
    // Agents do not survive a restart of Usho
    for (const task of tasks) {
      if (task.run?.state === 'running' || task.run?.state === 'starting') {
        task.run.state = 'stopped'
        task.run.message = 'Usho was closed while the agent was working.'
        task.slot = null
      }
    }
    assignSlots(tasks)
  }
  return tasks
}

let notifyTimer: NodeJS.Timeout | null = null

// Agents change their task many times a second, so tell the windows at most every 150 ms
function notifyWindows(): void {
  if (notifyTimer) return
  notifyTimer = setTimeout(() => {
    notifyTimer = null
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('tasks:changed')
  }, 150)
}

// Writes one at a time, so a slow write never lands after a newer one
function save(list: TaskRecord[]): Promise<void> {
  tasks = list
  saving = saving.then(async () => {
    await mkdir(app.getPath('userData'), { recursive: true })
    await writeFile(tasksFile(), JSON.stringify({ tasks: list }, null, 2))
  })
  notifyWindows()
  return saving
}

// Tasks whose agent has not started yet take free slots in the order they were created
function assignSlots(list: TaskRecord[]): void {
  const used = new Set(list.map((task) => task.slot))
  for (const task of list) {
    if (task.slot !== null || task.run) continue
    const free = Array.from({ length: SLOT_COUNT }, (_, i) => i + 1).find((n) => !used.has(n))
    if (free === undefined) return
    task.slot = free
    used.add(free)
  }
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '')
  return slug || 'task'
}

function isValidStart(issue: IssueRef, config: AgentConfig): boolean {
  return (
    Number.isInteger(issue?.number) &&
    issue.number > 0 &&
    typeof issue.title === 'string' &&
    typeof issue.url === 'string' &&
    (config?.agent === 'Claude Code' || config?.agent === 'Codex') &&
    typeof config.model === 'string' &&
    typeof config.effort === 'string'
  )
}

export function allTasks(): Promise<TaskRecord[]> {
  return load()
}

export async function getTask(id: string): Promise<TaskRecord | undefined> {
  return (await load()).find((task) => task.id === id)
}

/** Changes a task and saves it. A slot freed by the change goes to the next waiting task. */
export async function updateTask(id: string, change: (task: TaskRecord) => void): Promise<TaskRecord | undefined> {
  const list = await load()
  const task = list.find((t) => t.id === id)
  if (!task) return undefined
  change(task)
  assignSlots(list)
  await save(list)
  return task
}

export async function listTasks(): Promise<Result<TaskRecord[]>> {
  return { ok: true, value: await load() }
}

/**
 * Creates a task for an issue in the current repository. Every task gets its own branch and
 * worktree, so several agents can work on the same issue without touching each other.
 */
export async function startTask(issue: IssueRef, config: AgentConfig): Promise<Result<TaskRecord>> {
  if (!isValidStart(issue, config)) return { ok: false, error: 'The issue or agent settings are not valid.' }
  const repo = await getRepo()
  if (!repo.ok) return repo
  if (!repo.value) return { ok: false, error: 'Choose a repository first.' }
  const { path: repoPath, nameWithOwner, defaultBranch } = repo.value

  const id = randomUUID()
  const shortId = id.slice(0, 6)
  const branch = `usho/${issue.number}-${slugify(issue.title)}-${shortId}`
  const worktreePath = join(
    app.getPath('userData'),
    'worktrees',
    nameWithOwner.replace('/', '-'),
    `${issue.number}-${shortId}`
  )
  try {
    // Branch off the latest default branch on GitHub, not whatever is checked out locally
    await run('git', ['fetch', 'origin', defaultBranch], repoPath)
    await run('git', ['worktree', 'add', '-b', branch, worktreePath, `origin/${defaultBranch}`], repoPath)
  } catch (err) {
    return { ok: false, error: `Could not create a worktree: ${errorText(err)}` }
  }

  const task: TaskRecord = {
    id,
    repo: nameWithOwner,
    repoPath,
    issue: { number: issue.number, title: issue.title, url: issue.url },
    config: { agent: config.agent, model: config.model, effort: config.effort },
    branch,
    worktreePath,
    slot: null,
    createdAt: new Date().toISOString()
  }
  const list = [...(await load()), task]
  assignSlots(list)
  await save(list)
  return { ok: true, value: task }
}

/** Removes a task with its worktree and branch. Stop its agent first. */
export async function discardTask(id: string): Promise<Result<null>> {
  const list = await load()
  const task = list.find((t) => t.id === id)
  if (!task) return { ok: false, error: 'This task no longer exists.' }

  try {
    await run('git', ['worktree', 'remove', '--force', task.worktreePath], task.repoPath)
  } catch (err) {
    // The folder may have been deleted by hand; then git only needs to forget it
    if (existsSync(task.worktreePath)) return { ok: false, error: `Could not remove the worktree: ${errorText(err)}` }
    await run('git', ['worktree', 'prune'], task.repoPath).catch(() => undefined)
  }
  await run('git', ['branch', '-D', task.branch], task.repoPath).catch(() => undefined)

  const rest = list.filter((t) => t.id !== id)
  assignSlots(rest)
  await save(rest)
  return { ok: true, value: null }
}

export async function openWorktree(id: string): Promise<Result<null>> {
  const task = await getTask(id)
  if (!task) return { ok: false, error: 'This task no longer exists.' }
  const error = await shell.openPath(task.worktreePath)
  return error ? { ok: false, error } : { ok: true, value: null }
}
