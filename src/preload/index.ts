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
  onOpenFindBar: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('open-find-bar', handler)
    return () => ipcRenderer.removeListener('open-find-bar', handler)
  },
  findInPage: (text: string, findNext?: boolean, forward?: boolean): Promise<void> =>
    ipcRenderer.invoke('find-in-page', text, findNext, forward),
  stopFindInPage: (): Promise<void> =>
    ipcRenderer.invoke('stop-find-in-page'),
  onRefocusFindBar: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('refocus-find-bar', handler)
    return () => ipcRenderer.removeListener('refocus-find-bar', handler)
  }
})
