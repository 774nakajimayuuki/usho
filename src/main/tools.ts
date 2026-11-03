import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ToolStatus } from '../shared/types'

const execFileAsync = promisify(execFile)

const TOOLS = [
  { command: 'gh', label: 'GitHub CLI' },
  { command: 'claude', label: 'Claude Code' },
  { command: 'codex', label: 'Codex CLI' }
]

// Apps started from the Dock or Finder get a minimal PATH, so CLIs installed with
// Homebrew, npm or their own installers are not found. Take the PATH from the
// user's login shell instead.
export async function loadShellPath(): Promise<void> {
  if (process.platform === 'win32') return
  const marker = '__USHO_PATH__'
  try {
    const { stdout } = await execFileAsync(
      process.env.SHELL || '/bin/zsh',
      ['-ilc', `printf '${marker}%s${marker}' "$PATH"`],
      { timeout: 5000 }
    )
    const path = stdout.split(marker)[1]
    if (path) process.env.PATH = path
  } catch {
    // Keep the inherited PATH
  }
}

async function checkTool(command: string, label: string): Promise<ToolStatus> {
  try {
    // npm installs CLIs as .cmd shims on Windows, which only run through a shell
    const { stdout } = await execFileAsync(command, ['--version'], {
      timeout: 10_000,
      shell: process.platform === 'win32'
    })
    return { command, label, installed: true, version: stdout.trim().split(/\r?\n/)[0] }
  } catch {
    return { command, label, installed: false, version: null }
  }
}

export function checkTools(): Promise<ToolStatus[]> {
  return Promise.all(TOOLS.map(({ command, label }) => checkTool(command, label)))
}
