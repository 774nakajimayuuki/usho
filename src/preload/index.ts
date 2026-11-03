import { contextBridge, ipcRenderer } from 'electron'
import type { UshoApi } from '../shared/types'

const api: UshoApi = {
  checkTools: () => ipcRenderer.invoke('tools:check'),
  getRepo: () => ipcRenderer.invoke('repo:get'),
  chooseRepo: () => ipcRenderer.invoke('repo:choose'),
  listIssues: () => ipcRenderer.invoke('issues:list'),
  listTasks: () => ipcRenderer.invoke('tasks:list'),
  startTask: (issue, config) => ipcRenderer.invoke('tasks:start', issue, config),
  discardTask: (id) => ipcRenderer.invoke('tasks:discard', id),
  openWorktree: (id) => ipcRenderer.invoke('tasks:open-worktree', id),
  answerApproval: (id, allow) => ipcRenderer.invoke('tasks:answer', id, allow),
  stopAgent: (id) => ipcRenderer.invoke('tasks:stop', id),
  onTasksChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('tasks:changed', listener)
    return () => ipcRenderer.removeListener('tasks:changed', listener)
  }
}

contextBridge.exposeInMainWorld('usho', api)
