import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Issue, RepoInfo } from '../shared/types'

const execFileAsync = promisify(execFile)

async function gh(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync('gh', args, { cwd, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 })
  return stdout
}

/** gh explains most failures on stderr, such as "not a git repository". */
export function ghErrorText(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  if (typeof stderr === 'string' && stderr.trim()) return stderr.trim()
  return err instanceof Error ? err.message : String(err)
}

/** Finds the GitHub repository a local clone belongs to. Throws if the folder is not one. */
export async function readRepo(path: string): Promise<RepoInfo> {
  const repo = JSON.parse(await gh(['repo', 'view', '--json', 'nameWithOwner,url'], path)) as {
    nameWithOwner: string
    url: string
  }
  return { path, nameWithOwner: repo.nameWithOwner, url: repo.url }
}

export async function listOpenIssues(repo: RepoInfo): Promise<Issue[]> {
  const out = await gh(
    [
      'issue',
      'list',
      '--repo',
      repo.nameWithOwner,
      '--state',
      'open',
      '--limit',
      '100',
      '--json',
      'number,title,url,updatedAt,labels'
    ],
    repo.path
  )
  const issues = JSON.parse(out) as (Omit<Issue, 'labels'> & { labels: { name: string }[] })[]
  return issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    url: issue.url,
    updatedAt: issue.updatedAt,
    labels: issue.labels.map((label) => label.name)
  }))
}
