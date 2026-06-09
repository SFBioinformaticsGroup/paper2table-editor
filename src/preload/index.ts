import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  openDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('open-directory'),
  listDirectory: (dirPath: string): Promise<unknown> =>
    ipcRenderer.invoke('list-directory', dirPath),
  loadPaper: (dirPath: string, fileName: string): Promise<unknown> =>
    ipcRenderer.invoke('load-paper', dirPath, fileName),
  onDirectorySelected: (callback: (path: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('directory-selected', handler)
    return () => ipcRenderer.removeListener('directory-selected', handler)
  }
})
