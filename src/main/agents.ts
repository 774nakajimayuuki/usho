import type { ChildProcess } from 'node:child_process'
import type { AgentRun, Result, TaskRecord } from '../shared/types'
import { approvalsFrom, describeToolUses, runClaude, type StreamEvent } from './claude'
import { errorText } from './exec'
import { readIssue } from './github'
import { allTasks, getTask, updateTask } from './tasks'

const processes = new Map<string, ChildProcess>()
const stoppedByYou = new Set<string>()

// Users' own instructions may ask for extras on every message they type, such as feedback
// on their English; Usho's prompts are not typed by them, so those should not apply
const FROM_USHO = 'This message was written by Usho, an automated tool, not typed by the user. Do not comment on its wording.'

function now(): string {
  return new Date().toISOString()
}

function log(run: AgentRun, text: string): void {
  run.activity.push({ at: now(), text })
  if (run.activity.length > 200) run.activity.splice(0, run.activity.length - 200)
  run.lastEventAt = now()
}

async function updateRun(id: string, change: (run: AgentRun, task: TaskRecord) => void): Promise<void> {
  await updateTask(id, (task) => {
    if (task.run) change(task.run, task)
  })
}

async function issuePrompt(task: TaskRecord): Promise<string> {
  if (!task.issue) throw new Error('This task has no issue.')
  const issue = await readIssue(task.repo, task.issue.number, task.repoPath)
  const comments = issue.comments.map((c) => `${c.author} wrote:\n${c.body}`).join('\n\n')
  return [
    `You are working on GitHub issue #${task.issue.number} in ${task.repo}: ${issue.title}`,
    issue.body.slice(0, 20_000),
    comments ? `Comments on the issue:\n\n${comments.slice(0, 20_000)}` : '',
    `You are in a git worktree on the branch ${task.branch}, made for this issue only. ` +
      'Make the change the issue asks for, and keep it focused.',
    'Do not commit, push or open a pull request. Usho shows your changes to the user, who decides what happens next.',
    'When you are done, reply with a short summary of what you changed and anything left open.',
    FROM_USHO
  ]
    .filter(Boolean)
    .join('\n\n')
}

function launch(task: TaskRecord, prompt: string, allowedTools: string[], resumeSessionId?: string): void {
  const child = runClaude(
    {
      cwd: task.worktreePath,
      prompt,
      model: task.config.model,
      effort: task.config.effort,
      resumeSessionId,
      allowedTools
    },
    {
      onEvent: (event) => void handleEvent(task, event),
      onExit: (code, stderr) => void handleExit(task.id, code, stderr)
    }
  )
  processes.set(task.id, child)
}

async function handleEvent(task: TaskRecord, event: StreamEvent): Promise<void> {
  if (event.type === 'system' && event.subtype === 'init') {
    await updateRun(task.id, (run) => {
      // A session that already has an ID is being resumed, such as after an approval
      log(run, run.sessionId ? 'Claude Code continued' : `Claude Code started with ${event.model ?? task.config.model}`)
      run.state = 'running'
      run.sessionId = event.session_id ?? run.sessionId
    })
    return
  }

  if (event.type === 'system' && event.subtype === 'permission_denied') {
    await updateRun(task.id, (run) => log(run, `Was not allowed to use ${event.tool_name ?? 'a tool'}`))
    return
  }

  const steps = describeToolUses(event, task.worktreePath)
  if (steps.length > 0) {
    await updateRun(task.id, (run) => {
      for (const step of steps) log(run, step)
      run.current = steps[steps.length - 1]
    })
    return
  }

  if (event.type !== 'result') return
  const approvals = approvalsFrom(event)
  await updateRun(task.id, (run, record) => {
    run.sessionId = event.session_id ?? run.sessionId
    run.costUsd += event.total_cost_usd ?? 0
    run.message = event.result ?? null
    if (event.is_error) {
      run.state = 'failed'
      run.current = 'Stopped with an error'
      log(run, 'Stopped with an error')
    } else if (approvals.length > 0) {
      // The agent keeps its slot: it is waiting for you, not done
      run.state = 'needs-approval'
      run.approvals = approvals
      run.current = `Wants to run ${approvals[0].detail}`
      log(run, `Stopped to ask before running ${approvals.map((a) => a.detail).join(', ')}`)
    } else {
      run.state = 'finished'
      run.current = 'Finished'
      log(run, 'Finished')
    }
    if (run.state !== 'needs-approval') record.slot = null
  })
  await startWaiting()
}

async function handleExit(id: string, code: number | null, stderr: string): Promise<void> {
  processes.delete(id)
  const byYou = stoppedByYou.delete(id)
  const task = await getTask(id)
  if (!task?.run) return
  if (byYou) {
    await updateRun(id, (run, record) => {
      run.state = 'stopped'
      run.current = 'Stopped'
      run.message = 'You stopped the agent.'
      log(run, 'You stopped the agent')
      record.slot = null
    })
  } else if (task.run.state === 'starting' || task.run.state === 'running') {
    // Ended without a result: claude could not start, or crashed
    await updateRun(id, (run, record) => {
      run.state = 'failed'
      run.current = 'Claude Code ended unexpectedly'
      run.message = stderr.trim() || `Claude Code exited with code ${code}.`
      log(run, 'Claude Code ended unexpectedly')
      record.slot = null
    })
  }
  await startWaiting()
}

async function startAgent(id: string): Promise<void> {
  const task = await getTask(id)
  if (!task || task.slot === null || task.run) return
  const run: AgentRun = {
    state: 'starting',
    sessionId: null,
    current: 'Starting',
    activity: [],
    startedAt: now(),
    lastEventAt: now(),
    approvals: [],
    message: null,
    costUsd: 0
  }

  if (task.config.agent !== 'Claude Code') {
    await updateTask(id, (record) => {
      record.run = { ...run, state: 'unsupported', current: 'Not connected', message: `${record.config.agent} is not connected to Usho yet.` }
      record.slot = null
    })
    return
  }

  await updateTask(id, (record) => {
    record.run = run
  })
  try {
    launch(task, await issuePrompt(task), [])
  } catch (err) {
    await updateRun(id, (r, record) => {
      r.state = 'failed'
      r.message = `Could not read the issue: ${errorText(err)}`
      record.slot = null
    })
  }
}

/** Starts the agents of tasks that have a slot but have not started yet. */
export async function startWaiting(): Promise<void> {
  for (const task of await allTasks()) {
    if (task.slot !== null && !task.run) await startAgent(task.id)
  }
}

export async function answerApproval(id: string, allow: boolean): Promise<Result<null>> {
  const task = await getTask(id)
  const run = task?.run
  if (!task || run?.state !== 'needs-approval' || !run.sessionId) {
    return { ok: false, error: 'Nothing is waiting for your approval.' }
  }
  const approvals = run.approvals
  const details = approvals.map((a) => a.detail).join('\n')
  const prompt = allow
    ? `The user allowed this, so you can run it now:\n${details}\nRun it and continue with the task.\n\n${FROM_USHO}`
    : `The user did not allow this:\n${details}\nContinue without it, and say in your summary what you could not do.\n\n${FROM_USHO}`

  await updateRun(id, (r) => {
    r.state = 'running'
    r.approvals = []
    r.current = allow ? `Running ${approvals[0].detail}` : 'Continuing without it'
    log(r, allow ? `You allowed ${details}` : `You denied ${details}`)
  })
  launch(task, prompt, allow ? approvals.map((a) => a.rule) : [], run.sessionId)
  return { ok: true, value: null }
}

export async function stopAgent(id: string): Promise<Result<null>> {
  const child = processes.get(id)
  if (child) {
    stoppedByYou.add(id)
    child.kill()
    return { ok: true, value: null }
  }
  // Waiting for an approval: no process runs, so just let go of the slot
  const task = await getTask(id)
  if (task?.run?.state === 'needs-approval') {
    await updateRun(id, (run, record) => {
      run.state = 'stopped'
      run.current = 'Stopped'
      run.approvals = []
      run.message = 'You stopped the agent.'
      log(run, 'You stopped the agent')
      record.slot = null
    })
    await startWaiting()
  }
  return { ok: true, value: null }
}

export function stopAllAgents(): void {
  for (const child of processes.values()) child.kill()
}
