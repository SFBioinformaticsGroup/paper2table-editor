import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, readdirSync, writeFileSync, unlinkSync, existsSync, statSync } from 'fs'
import Ajv2020 from 'ajv/dist/2020'
import { readConfig, writeConfig, addRecentDir } from './config'

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

function buildMenu(win: BrowserWindow): void {
  const config = readConfig()

  const openDir = async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      ...(config.lastOpenedParent ? { defaultPath: config.lastOpenedParent } : {})
    })
    if (!result.canceled && result.filePaths.length > 0) {
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
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => win.webContents.send('undo-paper') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => win.webContents.send('redo-paper') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
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
        { label: 'Find…', accelerator: 'CmdOrCtrl+F', click: () => win.webContents.send('focus-search-bar') }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Back', accelerator: 'CmdOrCtrl+[', click: () => win.webContents.send('navigate-back') },
        { label: 'Forward', accelerator: 'CmdOrCtrl+]', click: () => win.webContents.send('navigate-forward') }
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
    mainWindow.webContents.openDevTools()
  }
}

app.whenReady().then(() => {
  initValidator()
  createWindow()
})

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

  return { metadata, fileNames }
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


ipcMain.handle('get-recent-dirs', () => {
  return readConfig().recentDirs.slice(0, 3)
})

ipcMain.handle('mark-dir-opened', (_event, dirPath: string) => {
  addRecentDir(dirPath)
  if (mainWindow) buildMenu(mainWindow)
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
