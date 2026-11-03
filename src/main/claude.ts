import { spawn, type ChildProcess } from 'node:child_process'
import { relative } from 'node:path'
import { createInterface } from 'node:readline'
import type { PendingApproval } from '../shared/types'

/** The lines of `claude -p --output-format stream-json` that Usho reads. */
export interface StreamEvent {
  type: string
  subtype?: string
  session_id?: string
  model?: string
  /** Set on `system` / `permission_denied` events */
  tool_name?: string
  message?: { content?: ContentPart[] | string }
  result?: string
  is_error?: boolean
  total_cost_usd?: number
  permission_denials?: PermissionDenial[]
}

interface ContentPart {
  type: string
  name?: string
  input?: Record<string, unknown>
  text?: string
}

interface PermissionDenial {
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface ClaudeRunOptions {
  cwd: string
  prompt: string
  model: string
  effort: string
  resumeSessionId?: string
  allowedTools?: string[]
}

export interface ClaudeRunHandlers {
  onEvent: (event: StreamEvent) => void
  /** Called once, when the process ends or could not start */
  onExit: (code: number | null, stderr: string) => void
}

// Usho shows model names; the CLI wants model IDs
const MODEL_IDS: Record<string, string> = {
  'Fable 5.1': 'claude-fable-5-1',
  'Opus 5.5': 'claude-opus-5-5',
  'Sonnet 5.5': 'claude-sonnet-5-5',
  'Haiku 5.5': 'claude-haiku-5-5'
}

// A claude started from inside another Claude Code session tries to use that session's
// credentials, so drop the variables that tie it to a parent session
function agentEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  const fromParentSession = 'CLAUDECODE' in env
  for (const key of Object.keys(env)) {
    if (key === 'CLAUDECODE' || key.startsWith('CLAUDE_CODE_') || key.startsWith('CLAUDE_AGENT_SDK_')) delete env[key]
  }
  if (fromParentSession) delete env.ANTHROPIC_BASE_URL
  return env
}

/**
 * Runs Claude Code headless in a worktree. File edits inside the worktree are allowed, and so is
 * what Claude Code allows on its own. Anything it would normally ask about is denied and
 * reported, so Usho can ask you and resume.
 */
export function runClaude(options: ClaudeRunOptions, handlers: ClaudeRunHandlers): ChildProcess {
  const args = [
    '-p',
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    MODEL_IDS[options.model] ?? options.model,
    '--effort',
    options.effort,
    '--permission-mode',
    'acceptEdits',
    '--permission-prompts',
    'none'
  ]
  if (options.resumeSessionId) args.push('--resume', options.resumeSessionId)
  if (options.allowedTools?.length) args.push('--allowedTools', ...options.allowedTools)

  // USHO_CLAUDE_BIN points at a claude that is not on the PATH
  const child = spawn(process.env.USHO_CLAUDE_BIN || 'claude', args, { cwd: options.cwd, env: agentEnv() })

  let stderr = ''
  let exited = false
  const exit = (code: number | null, message: string): void => {
    if (exited) return
    exited = true
    handlers.onExit(code, message)
  }

  child.stderr.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-4000)
  })
  createInterface({ input: child.stdout }).on('line', (line) => {
    if (!line.startsWith('{')) return
    try {
      handlers.onEvent(JSON.parse(line) as StreamEvent)
    } catch {
      // Not a JSON line
    }
  })
  child.on('error', (err) => exit(null, err.message))
  child.on('close', (code) => exit(code, stderr))

  // The prompt goes through stdin, so it never has to be quoted for a shell
  child.stdin.on('error', () => undefined)
  child.stdin.end(options.prompt)
  return child
}

/** The tool calls in an assistant message, as one line each, such as "Editing src/app.ts". */
export function describeToolUses(event: StreamEvent, cwd: string): string[] {
  const content = event.message?.content
  if (event.type !== 'assistant' || !Array.isArray(content)) return []
  return content.filter((part) => part.type === 'tool_use').map((part) => describeTool(part.name ?? '', part.input ?? {}, cwd))
}

function describeTool(name: string, input: Record<string, unknown>, cwd: string): string {
  const text = (key: string): string => String(input[key] ?? '')
  const file = (key: string): string => (text(key).startsWith(cwd) ? relative(cwd, text(key)) : text(key))
  switch (name) {
    case 'Read':
      return `Reading ${file('file_path')}`
    case 'Edit':
    case 'MultiEdit':
      return `Editing ${file('file_path')}`
    case 'Write':
      return `Writing ${file('file_path')}`
    case 'Bash':
      return `Running ${text('command')}`
    case 'Grep':
      return `Searching for "${text('pattern')}"`
    case 'Glob':
      return `Looking for files matching ${text('pattern')}`
    case 'WebFetch':
      return `Reading ${text('url')}`
    case 'WebSearch':
      return `Searching the web for "${text('query')}"`
    case 'TodoWrite':
      return 'Updating its plan'
    case 'Task':
    case 'Agent':
      return 'Handing part of the work to a sub-agent'
    default:
      return `Using ${name}`
  }
}

// Reading outside the worktree is refused on purpose, and agents find their way around it,
// so these denials are not worth asking you about
const READ_ONLY_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'NotebookRead'])

/** What the agent was not allowed to do in this run and may need from you, once each. */
export function approvalsFrom(event: StreamEvent): PendingApproval[] {
  const approvals = new Map<string, PendingApproval>()
  for (const denial of event.permission_denials ?? []) {
    if (READ_ONLY_TOOLS.has(denial.tool_name)) continue
    const approval: PendingApproval =
      denial.tool_name === 'Bash'
        ? {
            tool: 'Bash',
            detail: String(denial.tool_input.command ?? ''),
            rule: `Bash(${String(denial.tool_input.command ?? '')})`
          }
        : {
            tool: denial.tool_name,
            detail: `${denial.tool_name} ${JSON.stringify(denial.tool_input).slice(0, 200)}`,
            rule: denial.tool_name
          }
    approvals.set(approval.rule, approval)
  }
  return [...approvals.values()]
}
