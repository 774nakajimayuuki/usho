import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { chooseRepo, getRepo, listIssues } from './repo'
import { checkTools, loadShellPath } from './tools'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: 'Usho',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  // Open links in the default browser instead of a new app window
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServerUrl = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devServerUrl) {
    void win.loadURL(devServerUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await loadShellPath()
  ipcMain.handle('tools:check', () => checkTools())
  ipcMain.handle('repo:get', () => getRepo())
  ipcMain.handle('repo:choose', (event) => chooseRepo(BrowserWindow.fromWebContents(event.sender)))
  ipcMain.handle('issues:list', () => listIssues())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
