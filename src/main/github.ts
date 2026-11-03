import type { Issue, RepoInfo } from '../shared/types'
import { run } from './exec'

/** Finds the GitHub repository a local clone belongs to. Throws if the folder is not one. */
export async function readRepo(path: string): Promise<RepoInfo> {
  const out = await run('gh', ['repo', 'view', '--json', 'nameWithOwner,url,defaultBranchRef'], path)
  const repo = JSON.parse(out) as { nameWithOwner: string; url: string; defaultBranchRef: { name: string } }
  return { path, nameWithOwner: repo.nameWithOwner, url: repo.url, defaultBranch: repo.defaultBranchRef.name }
}

export interface IssueContent {
  title: string
  body: string
  comments: { author: string; body: string }[]
}

export async function readIssue(repo: string, number: number, cwd: string): Promise<IssueContent> {
  const out = await run('gh', ['issue', 'view', String(number), '--repo', repo, '--json', 'title,body,comments'], cwd)
  const issue = JSON.parse(out) as {
    title: string
    body: string
    comments: { author: { login: string } | null; body: string }[]
  }
  return {
    title: issue.title,
    body: issue.body,
    comments: issue.comments.map((c) => ({ author: c.author?.login ?? 'someone', body: c.body }))
  }
}

export async function listOpenIssues(repo: RepoInfo): Promise<Issue[]> {
  const out = await run(
    'gh',
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
