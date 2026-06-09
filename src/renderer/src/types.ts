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
}

export interface TableWithFragments {
  table_fragments: TableFragment[]
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

export interface DirectoryState {
  dirPath: string
  metadata: Metadata
  fileNames: string[]
  papers: Record<string, TablesFile>
  validationErrors: Record<string, string[]>
}
