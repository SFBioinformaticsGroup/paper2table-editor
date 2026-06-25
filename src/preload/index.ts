import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('open-directory'),
  listDirectory: (dirPath: string): Promise<unknown> =>
    ipcRenderer.invoke('list-directory', dirPath),
  loadPaper: (dirPath: string, fileName: string): Promise<unknown> =>
    ipcRenderer.invoke('load-paper', dirPath, fileName),
  savePaper: (dirPath: string, fileName: string, content: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('save-paper', dirPath, fileName, content),
  deletePaper: (dirPath: string, fileName: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('delete-paper', dirPath, fileName),
  savePaperAs: (
    dirPath: string,
    suggestedName: string,
    content: string
  ): Promise<{ ok: boolean; filePath: string | null }> =>
    ipcRenderer.invoke('save-paper-as', dirPath, suggestedName, content),
  onDirectorySelected: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('directory-selected', handler)
    return () => ipcRenderer.removeListener('directory-selected', handler)
  },
  onSaveCurrentPaper: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('save-current-paper', handler)
    return () => ipcRenderer.removeListener('save-current-paper', handler)
  },
  onSaveCurrentPaperAs: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('save-current-paper-as', handler)
    return () => ipcRenderer.removeListener('save-current-paper-as', handler)
  },
  onUndoPaper: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('undo-paper', handler)
    return () => ipcRenderer.removeListener('undo-paper', handler)
  },
  onRedoPaper: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('redo-paper', handler)
    return () => ipcRenderer.removeListener('redo-paper', handler)
  },
  onNavigateBack: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('navigate-back', handler)
    return () => ipcRenderer.removeListener('navigate-back', handler)
  },
  onNavigateForward: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('navigate-forward', handler)
    return () => ipcRenderer.removeListener('navigate-forward', handler)
  },
  resolveSources: (
    dirPath: string,
    sources: Array<{ uuid: string; path: string }>
  ): Promise<Array<{ uuid: string; fullPath: string; isDir: boolean }>> =>
    ipcRenderer.invoke('resolve-sources', dirPath, sources),
  onFocusSearchBar: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('focus-search-bar', handler)
    return () => ipcRenderer.removeListener('focus-search-bar', handler)
  },
  onSetShowEmptyRows: (callback: (show: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, show: boolean) => callback(show)
    ipcRenderer.on('set-show-empty-rows', handler)
    return () => ipcRenderer.removeListener('set-show-empty-rows', handler)
  },
  getRecentDirs: (): Promise<string[]> =>
    ipcRenderer.invoke('get-recent-dirs'),
  markDirOpened: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('mark-dir-opened', dirPath)
})
