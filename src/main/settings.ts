import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface Settings {
  repoPath?: string
}

function settingsFile(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export async function loadSettings(): Promise<Settings> {
  try {
    return JSON.parse(await readFile(settingsFile(), 'utf8')) as Settings
  } catch {
    // No settings saved yet
    return {}
  }
}

export async function saveSettings(changes: Settings): Promise<void> {
  const settings = { ...(await loadSettings()), ...changes }
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(settingsFile(), JSON.stringify(settings, null, 2))
}
