export interface AppConfig {
  recentDirs: string[]
  lastOpenedParent: string
  userName?: string
  pinnedPapers?: Record<string, string[]>
  archivedPapers?: Record<string, string[]>
  paperNotes?: Record<string, Record<string, string>>
  autoSyncPaths?: Record<string, string>
}

export function applyAnnotations(
  config: AppConfig,
  dirPath: string,
  pinned: string[],
  archived: string[],
  notes: Record<string, string>
): AppConfig {
  return {
    ...config,
    pinnedPapers: { ...(config.pinnedPapers ?? {}), [dirPath]: pinned },
    archivedPapers: { ...(config.archivedPapers ?? {}), [dirPath]: archived },
    paperNotes: { ...(config.paperNotes ?? {}), [dirPath]: notes }
  }
}
