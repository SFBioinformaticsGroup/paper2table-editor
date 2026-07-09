import type { AppConfig } from './configUtils'

export interface ResultsetAnnotations {
  pinned: string[]
  archived: string[]
  notes: Record<string, string>
}

export function getAnnotations(config: AppConfig, dirPath: string): ResultsetAnnotations {
  return {
    pinned: config.pinnedPapers?.[dirPath] ?? [],
    archived: config.archivedPapers?.[dirPath] ?? [],
    notes: config.paperNotes?.[dirPath] ?? {}
  }
}

export function applyAnnotations(
  config: AppConfig,
  dirPath: string,
  { pinned, archived, notes }: ResultsetAnnotations
): AppConfig {
  return {
    ...config,
    pinnedPapers: { ...(config.pinnedPapers ?? {}), [dirPath]: pinned },
    archivedPapers: { ...(config.archivedPapers ?? {}), [dirPath]: archived },
    paperNotes: { ...(config.paperNotes ?? {}), [dirPath]: notes }
  }
}
