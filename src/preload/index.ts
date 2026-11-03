import { contextBridge, ipcRenderer } from 'electron'
import type { UshoApi } from '../shared/types'

const api: UshoApi = {
  checkTools: () => ipcRenderer.invoke('tools:check')
}

contextBridge.exposeInMainWorld('usho', api)
