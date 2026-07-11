export interface ValueWithAgreement {
  value: string
  agreement_level: number
}

export type ColumnValue = null | string | number | ValueWithAgreement[]
export type Citation = null | string | ValueWithAgreement[]

export interface Row {
  agreement_level_?: number | null
  sources_?: string[] | null
  [key: string]: ColumnValue | string[] | undefined
}

export interface TableFragment {
  rows: Row[]
  page: number
}

export interface TableWithRows {
  rows: Row[]
  page: number
  title?: string
}

export interface TableWithFragments {
  table_fragments: TableFragment[]
  title?: string
}

export type Table = TableWithRows | TableWithFragments

export interface TablesFile {
  tables: Table[]
  citation?: Citation
  metadata?: Record<string, unknown> | null
  uuid?: string | null
}

export interface Source {
  uuid?: string
  reader?: string
  path?: string
  [key: string]: unknown
}

export interface Metadata {
  reader?: string
  agreement_method?: string
  sources?: Source[]
  [key: string]: unknown
}

export interface Curation {
  curator: string
  timestamp: string
  description: string
}

export interface ResolvedSource {
  fullPath: string
  isDir: boolean
}

export type PaperNotes = Record<string, string>

export interface DirectoryState {
  dirPath: string
  metadata: Metadata
  resolvedSources: Record<string, ResolvedSource>  // keyed by uuid
  fileNames: string[]
  pinnedPapers: string[]
  archivedPapers: string[]
  paperNotes: PaperNotes
  papers: Record<string, TablesFile>
  validationErrors: Record<string, string[]>
  tablemergeSettings: Record<string, unknown> | null
}

export type PaperState = TablesFile | null

export interface PaperHistory {
  past: PaperState[]
  present: PaperState
  future: PaperState[]
  savedSnapshot: PaperState
}

export type EditHistories = Record<string, PaperHistory>
