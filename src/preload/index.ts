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
  getUserName: (): Promise<string> =>
    ipcRenderer.invoke('get-user-name'),
  setUserName: (name: string): Promise<void> =>
    ipcRenderer.invoke('set-user-name', name),
  onEditUserName: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('edit-user-name', handler)
    return () => ipcRenderer.removeListener('edit-user-name', handler)
  },
  getPinnedPapers: (dirPath: string): Promise<string[]> =>
    ipcRenderer.invoke('get-pinned-papers', dirPath),
  setPinnedPapers: (dirPath: string, fileNames: string[]): Promise<void> =>
    ipcRenderer.invoke('set-pinned-papers', dirPath, fileNames),
  getArchivedPapers: (dirPath: string): Promise<string[]> =>
    ipcRenderer.invoke('get-archived-papers', dirPath),
  setArchivedPapers: (dirPath: string, fileNames: string[]): Promise<void> =>
    ipcRenderer.invoke('set-archived-papers', dirPath, fileNames),
  getRecentDirs: (): Promise<string[]> =>
    ipcRenderer.invoke('get-recent-dirs'),
  markDirOpened: (dirPath: string): Promise<void> =>
    ipcRenderer.invoke('mark-dir-opened', dirPath),
  getPaperNotes: (dirPath: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke('get-paper-notes', dirPath),
  setPaperNote: (dirPath: string, fileName: string, text: string): Promise<void> =>
    ipcRenderer.invoke('set-paper-note', dirPath, fileName, text),
  exportAnnotations: (dirPath: string, pinned: string[], archived: string[], notes: Record<string, string>): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('export-annotations', dirPath, pinned, archived, notes),
  importAnnotations: (dirPath: string): Promise<{ pinned: string[]; archived: string[]; notes: Record<string, string> } | null> =>
    ipcRenderer.invoke('import-annotations', dirPath),
  onExportAnnotations: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('export-annotations', handler)
    return () => ipcRenderer.removeListener('export-annotations', handler)
  },
  onImportAnnotations: (callback: () => void): (() => void) => {
    const handler = () => callback()
    ipcRenderer.on('import-annotations', handler)
    return () => ipcRenderer.removeListener('import-annotations', handler)
  },
  importAnnotationsFromSyncFile: (dirPath: string): Promise<{ pinned: string[]; archived: string[]; notes: Record<string, string> } | null> =>
    ipcRenderer.invoke('import-annotations-from-sync-file', dirPath)
})
