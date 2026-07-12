declare const __GIT_SHA__: string

import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, readdirSync, writeFileSync, unlinkSync, existsSync, statSync } from 'fs'
import { spawn } from 'child_process'
import Ajv2020 from 'ajv/dist/2020'
import { readConfig, writeConfig, addRecentDir } from './config'
import { applyAnnotations, getAnnotations } from './annotations'
import type { ResultsetAnnotations } from './annotations'

let validateTablesFile: ((data: unknown) => { valid: boolean; errors: string[] }) | null = null

function initValidator(): void {
  try {
    const schemaPath = join(app.getAppPath(), 'resources', 'tablesfile.schema.json')
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
    const ajv = new Ajv2020({ allErrors: true })
    const validate = ajv.compile(schema)
    validateTablesFile = (data) => {
      const valid = validate(data) as boolean
      const errors = valid
        ? []
        : (validate.errors ?? []).map((e) => `${e.instancePath || '(root)'} ${e.message}`)
      return { valid, errors }
    }
  } catch (err) {
    console.error('Could not load JSON schema for validation:', err)
  }
}

let mainWindow: BrowserWindow | null = null
let showEmptyRows = false
let currentDirPath: string | null = null

function exportAnnotationsToSyncFiles(): void {
  const config = readConfig()
  for (const [dirPath, syncFilePath] of Object.entries(config.autoSyncPaths ?? {})) {
    try {
      writeFileSync(syncFilePath, JSON.stringify(getAnnotations(config, dirPath), null, 2), 'utf-8')
    } catch { /* ignore */ }
  }
}

function buildMenu(win: BrowserWindow): void {
  const config = readConfig()

  const openDir = async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      ...(config.lastOpenedParent ? { defaultPath: config.lastOpenedParent } : {})
    })
    if (!result.canceled && result.filePaths.length > 0) {
      currentDirPath = result.filePaths[0]
      addRecentDir(result.filePaths[0])
      buildMenu(win)
      win.webContents.send('directory-selected', result.filePaths[0])
    }
  }

  const recentItems: Electron.MenuItemConstructorOptions[] =
    config.recentDirs.length > 0
      ? [
        ...config.recentDirs.map((dirPath): Electron.MenuItemConstructorOptions => ({
          label: dirPath,
          click: () => {
            currentDirPath = dirPath
            addRecentDir(dirPath)
            buildMenu(win)
            win.webContents.send('directory-selected', dirPath)
          }
        })),
        { type: 'separator' },
        {
          label: 'Clear Recents',
          click: () => {
            const c = readConfig()
            c.recentDirs = []
            writeConfig(c)
            buildMenu(win)
          }
        }
      ]
      : [{ label: 'No Recent Items', enabled: false }]

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'Open ResultSets…', accelerator: 'CmdOrCtrl+O', click: openDir },
        { label: 'Open Recent', submenu: recentItems },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => win.webContents.send('save-current-paper') },
        { label: 'Save As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => win.webContents.send('save-current-paper-as') },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', registerAccelerator: false, click: () => win.webContents.send('undo-paper') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', registerAccelerator: false, click: () => win.webContents.send('redo-paper') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Edit Name…', click: () => win.webContents.send('edit-user-name') },
        { type: 'separator' },
        { label: 'Export Annotations…', enabled: currentDirPath !== null, click: () => win.webContents.send('export-annotations') },
        { label: 'Import Annotations…', enabled: currentDirPath !== null, click: () => win.webContents.send('import-annotations') },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: 'Auto Sync Annotations',
          enabled: currentDirPath !== null,
          checked: !!(currentDirPath && readConfig().autoSyncPaths?.[currentDirPath]),
          click: async () => {
            if (!currentDirPath) return
            const c = readConfig()
            if (c.autoSyncPaths?.[currentDirPath]) {
              delete c.autoSyncPaths[currentDirPath]
              writeConfig(c)
              buildMenu(win)
            } else {
              const result = await dialog.showSaveDialog(win, {
                defaultPath: join(currentDirPath, 'annotations.json'),
                filters: [{ name: 'JSON', extensions: ['json'] }]
              })
              if (!result.canceled && result.filePath) {
                const c2 = readConfig()
                c2.autoSyncPaths = { ...(c2.autoSyncPaths ?? {}), [currentDirPath]: result.filePath }
                writeConfig(c2)
                exportAnnotationsToSyncFiles()
                buildMenu(win)
              }
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', role: 'zoomIn' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+numadd', visible: false },
        { label: 'Zoom Out', role: 'zoomOut' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+numsub', visible: false },
        { label: 'Reset Zoom', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Find…', accelerator: 'CmdOrCtrl+F', click: () => win.webContents.send('focus-search-bar') },
        { type: 'separator' },
        {
          type: 'checkbox',
          label: 'Show Empty Rows',
          checked: showEmptyRows,
          click: () => {
            showEmptyRows = !showEmptyRows
            buildMenu(win)
            win.webContents.send('set-show-empty-rows', showEmptyRows)
          }
        }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => win.webContents.send('navigate-back') },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => win.webContents.send('navigate-forward') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Tables Editor',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: 'About Tables Editor',
            message: 'Tables Editor',
            detail: `Version: ${app.getVersion()}\nBuild: ${__GIT_SHA__}`
          })
        }
      ]
    }
  ]

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  buildMenu(mainWindow)

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    if (!app.isPackaged) mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  initValidator()
  createWindow()
  setInterval(exportAnnotationsToSyncFiles, 5 * 60 * 1000)
})

app.on('before-quit', exportAnnotationsToSyncFiles)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('open-directory', async () => {
  if (!mainWindow) return null
  const config = readConfig()
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    ...(config.lastOpenedParent ? { defaultPath: config.lastOpenedParent } : {})
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const dirPath = result.filePaths[0]
  currentDirPath = dirPath
  addRecentDir(dirPath)
  buildMenu(mainWindow)
  return dirPath
})

ipcMain.handle('list-directory', async (_event, dirPath: string) => {
  let metadata: Record<string, unknown> = {}
  try {
    const raw = readFileSync(join(dirPath, 'tables.metadata.json'), 'utf-8')
    metadata = JSON.parse(raw)
    if (metadata.reader === 'tablemerge' && !('agreement_method' in metadata)) {
      metadata = { ...metadata, agreement_method: 'simple-count' }
    }
  } catch {
    // no metadata file
  }

  let fileNames: string[] = []
  try {
    fileNames = readdirSync(dirPath)
      .filter((f) => f.endsWith('.tables.json') && f !== 'tables.metadata.json')
      .sort()
  } catch {
    // unreadable dir
  }

  let tablemergeSettings: Record<string, unknown> | null = null
  const settingsFilePath = join(dirPath, 'settings.tablemerge.json')
  if (existsSync(settingsFilePath)) {
    try {
      tablemergeSettings = JSON.parse(readFileSync(settingsFilePath, 'utf-8'))
    } catch {
      // malformed settings file
    }
  }

  return { metadata, fileNames, tablemergeSettings }
})

ipcMain.handle('load-paper', async (_event, dirPath: string, fileName: string) => {
  const data = JSON.parse(readFileSync(join(dirPath, fileName), 'utf-8'))
  const validationErrors: string[] = validateTablesFile
    ? (() => { const r = validateTablesFile(data); return r.valid ? [] : r.errors })()
    : []
  return { content: data, validationErrors }
})

ipcMain.handle('save-paper', async (_event, dirPath: string, fileName: string, content: string) => {
  writeFileSync(join(dirPath, fileName), content, 'utf-8')
  return { ok: true }
})

ipcMain.handle('delete-paper', async (_event, dirPath: string, fileName: string) => {
  unlinkSync(join(dirPath, fileName))
  return { ok: true }
})

ipcMain.handle('save-paper-as', async (_event, dirPath: string, suggestedName: string, content: string) => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: join(dirPath, suggestedName),
    filters: [{ name: 'Tables JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { ok: false, filePath: null }
  writeFileSync(result.filePath, content, 'utf-8')
  return { ok: true, filePath: result.filePath }
})


ipcMain.handle('get-pinned-papers', (_event, dirPath: string) => {
  return readConfig().pinnedPapers?.[dirPath] ?? []
})

ipcMain.handle('set-pinned-papers', (_event, dirPath: string, fileNames: string[]) => {
  const config = readConfig()
  config.pinnedPapers = { ...(config.pinnedPapers ?? {}), [dirPath]: fileNames }
  writeConfig(config)
})

ipcMain.handle('get-archived-papers', (_event, dirPath: string) => {
  return readConfig().archivedPapers?.[dirPath] ?? []
})

ipcMain.handle('set-archived-papers', (_event, dirPath: string, fileNames: string[]) => {
  const config = readConfig()
  config.archivedPapers = { ...(config.archivedPapers ?? {}), [dirPath]: fileNames }
  writeConfig(config)
})

ipcMain.handle('get-paper-notes', (_event, dirPath: string) => {
  return readConfig().paperNotes?.[dirPath] ?? {}
})

ipcMain.handle('set-paper-note', (_event, dirPath: string, fileName: string, text: string) => {
  const config = readConfig()
  const byDir = { ...(config.paperNotes ?? {}), [dirPath]: { ...(config.paperNotes?.[dirPath] ?? {}) } }
  if (text) {
    byDir[dirPath][fileName] = text
  } else {
    delete byDir[dirPath][fileName]
  }
  config.paperNotes = byDir
  writeConfig(config)
})

ipcMain.handle('export-annotations', async (_event, dirPath: string, pinned: string[], archived: string[], notes: Record<string, string>) => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(win!, {
    defaultPath: join(dirPath, 'annotations.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { ok: false }
  writeFileSync(result.filePath, JSON.stringify({ pinned, archived, notes }, null, 2), 'utf-8')
  return { ok: true }
})

ipcMain.handle('import-annotations', async (_event, dirPath: string) => {
  const win = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(win!, {
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const annotations: ResultsetAnnotations = JSON.parse(readFileSync(result.filePaths[0], 'utf-8'))
  writeConfig(applyAnnotations(readConfig(), dirPath, annotations))
  return annotations
})

ipcMain.handle('import-annotations-from-sync-file', (_event, dirPath: string) => {
  const config = readConfig()
  const syncFilePath = config.autoSyncPaths?.[dirPath]
  if (!syncFilePath || !existsSync(syncFilePath)) return null
  try {
    const annotations: ResultsetAnnotations = JSON.parse(readFileSync(syncFilePath, 'utf-8'))
    writeConfig(applyAnnotations(config, dirPath, annotations))
    return annotations
  } catch {
    return null
  }
})

ipcMain.handle('get-recent-dirs', () => {
  return readConfig().recentDirs.slice(0, 3)
})

ipcMain.handle('mark-dir-opened', (_event, dirPath: string) => {
  currentDirPath = dirPath
  addRecentDir(dirPath)
  if (mainWindow) buildMenu(mainWindow)
})

ipcMain.handle('get-user-name', () => readConfig().userName ?? '')

ipcMain.handle('set-user-name', (_event, name: string) => {
  const c = readConfig()
  c.userName = name
  writeConfig(c)
})

ipcMain.handle('run-tablemerge', (_event, paperName: string, outputPath: string, paths: string[]): Promise<{ ok: boolean; error?: string }> => {
  return new Promise((resolve) => {
    const child = spawn('tablemerge', ['--paper', paperName, '--settings', '-o', outputPath, ...paths], {
      cwd: outputPath,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true })
      } else {
        resolve({ ok: false, error: stderr || `tablemerge exited with code ${code}` })
      }
    })
    child.on('error', (err: Error) => {
      resolve({ ok: false, error: err.message })
    })
  })
})

ipcMain.handle('resolve-sources', async (
  _event,
  dirPath: string,
  sources: Array<{ uuid: string; path: string }>
) => {
  if (sources.length === 0) return []
  const candidates = [dirPath, dirname(dirPath), dirname(dirname(dirPath))]
  let baseDir: string | null = null
  for (const base of candidates) {
    for (const { path: sp } of sources) {
      if (existsSync(join(base, sp))) { baseDir = base; break }
    }
    if (baseDir) break
  }
  if (!baseDir) return []
  return sources.flatMap(({ uuid, path: sp }) => {
    const full = join(baseDir!, sp)
    if (!existsSync(full)) return []
    try {
      return [{ uuid, fullPath: full, isDir: statSync(full).isDirectory() }]
    } catch {
      return []
    }
  })
})
