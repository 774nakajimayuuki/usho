import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/** Runs a CLI such as gh or git without a shell, and returns its output. */
export async function run(command: string, args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync(command, args, { cwd, timeout: 120_000, maxBuffer: 16 * 1024 * 1024 })
  return stdout
}

/** gh and git explain most failures on stderr, such as "not a git repository". */
export function errorText(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  if (typeof stderr === 'string' && stderr.trim()) return stderr.trim()
  return err instanceof Error ? err.message : String(err)
}
