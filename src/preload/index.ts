import { contextBridge, ipcRenderer } from 'electron'
import type { UshoApi } from '../shared/types'

const api: UshoApi = {
  checkTools: () => ipcRenderer.invoke('tools:check'),
  getRepo: () => ipcRenderer.invoke('repo:get'),
  chooseRepo: () => ipcRenderer.invoke('repo:choose'),
  listIssues: () => ipcRenderer.invoke('issues:list')
}

contextBridge.exposeInMainWorld('usho', api)
