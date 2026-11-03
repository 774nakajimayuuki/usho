import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron'
import type { Issue, RepoInfo, Result } from '../shared/types'
import { errorText } from './exec'
import { listOpenIssues, readRepo } from './github'
import { loadSettings, saveSettings } from './settings'

let current: RepoInfo | null = null

export async function getRepo(): Promise<Result<RepoInfo | null>> {
  if (current) return { ok: true, value: current }
  const { repoPath } = await loadSettings()
  if (!repoPath) return { ok: true, value: null }
  try {
    current = await readRepo(repoPath)
    return { ok: true, value: current }
  } catch (err) {
    return { ok: false, error: `Could not open ${repoPath}: ${errorText(err)}` }
  }
}

export async function chooseRepo(win: BrowserWindow | null): Promise<Result<RepoInfo | null>> {
  const options: OpenDialogOptions = {
    title: 'Choose a local clone of a GitHub repository',
    properties: ['openDirectory']
  }
  const picked = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (picked.canceled || picked.filePaths.length === 0) return { ok: true, value: null }

  const path = picked.filePaths[0]
  try {
    current = await readRepo(path)
    await saveSettings({ repoPath: path })
    return { ok: true, value: current }
  } catch (err) {
    return { ok: false, error: `${path} is not a clone of a GitHub repository: ${errorText(err)}` }
  }
}

export async function listIssues(): Promise<Result<Issue[]>> {
  const repo = await getRepo()
  if (!repo.ok) return repo
  if (!repo.value) return { ok: false, error: 'Choose a repository first.' }
  try {
    return { ok: true, value: await listOpenIssues(repo.value) }
  } catch (err) {
    return { ok: false, error: errorText(err) }
  }
}
