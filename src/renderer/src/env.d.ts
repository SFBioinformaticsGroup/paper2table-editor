/// <reference types="vite/client" />

interface Window {
  api: {
    openDirectory: () => Promise<string | null>
    listDirectory: (dirPath: string) => Promise<unknown>
    loadPaper: (dirPath: string, fileName: string) => Promise<unknown>
    onDirectorySelected: (callback: (path: string) => void) => (() => void)
  }
}
