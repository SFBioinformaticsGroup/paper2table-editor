/// <reference types="vite/client" />

interface Window {
  api: {
    openDirectory: () => Promise<string | null>
    listDirectory: (dirPath: string) => Promise<unknown>
    loadPaper: (dirPath: string, fileName: string) => Promise<unknown>
    savePaper: (dirPath: string, fileName: string, content: string) => Promise<{ ok: boolean }>
    deletePaper: (dirPath: string, fileName: string) => Promise<{ ok: boolean }>
    savePaperAs: (
      dirPath: string,
      suggestedName: string,
      content: string
    ) => Promise<{ ok: boolean; filePath: string | null }>
    onDirectorySelected: (callback: (path: string) => void) => (() => void)
    onSaveCurrentPaper: (callback: () => void) => (() => void)
    onSaveCurrentPaperAs: (callback: () => void) => (() => void)
    onUndoPaper: (callback: () => void) => (() => void)
    onRedoPaper: (callback: () => void) => (() => void)
    onNavigateBack: (callback: () => void) => (() => void)
    onNavigateForward: (callback: () => void) => (() => void)
    resolveSources: (
      dirPath: string,
      sources: Array<{ uuid: string; path: string }>
    ) => Promise<Array<{ uuid: string; fullPath: string; isDir: boolean }>>
    onFocusSearchBar: (callback: () => void) => (() => void)
    onSetShowEmptyRows: (callback: (show: boolean) => void) => (() => void)
    getRecentDirs: () => Promise<string[]>
    markDirOpened: (dirPath: string) => Promise<void>
  }
}
