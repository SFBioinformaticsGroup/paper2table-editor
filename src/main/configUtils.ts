export interface AppConfig {
  recentDirs: string[]
  lastOpenedParent: string
  userName?: string
  pinnedPapers?: Record<string, string[]>
  archivedPapers?: Record<string, string[]>
  paperNotes?: Record<string, Record<string, string>>
  autoSyncPaths?: Record<string, string>
}

