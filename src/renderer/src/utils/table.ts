import { Row, ColumnValue, Citation, CurationType, Metadata, Table, ValueWithAgreement } from '@renderer/types';
import { getTableFragments } from './getTableFragments';

const META_KEYS = new Set(['agreement_level_', 'sources_', 'curation_type_'])

export function getRowColumns(row: Row): Record<string, ColumnValue> {
  const result: Record<string, ColumnValue> = {}
  for (const [key, val] of Object.entries(row)) {
    if (!META_KEYS.has(key)) {
      result[key] = val as ColumnValue
    }
  }
  return result
}

export function columnNames(rows: Row[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!META_KEYS.has(key) && !seen.has(key)) {
        seen.add(key)
        result.push(key)
      }
    }
  }
  return result
}

export function isEmptyRow(row: Row): boolean {
  for (const [key, val] of Object.entries(row)) {
    if (META_KEYS.has(key)) continue
    if (val == null) continue
    if (Array.isArray(val)) {
      if (val.some((v) => typeof v === 'object' && 'value' in v ? v.value !== '' : String(v) !== '')) return false
    } else if (String(val) !== '') {
      return false
    }
  }
  return true
}

export function renderColumnValue(val: ColumnValue): string {
  if (val == null) return ''
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'object' && 'value' in v ? v.value : String(v))).join(', ')
  return String(val)
}

export function renderCitationItems(citation: Citation | undefined): string[] {
  if (citation == null) return []
  const texts = Array.isArray(citation) ? citation.map((v) => v.value) : [citation]
  const items: string[] = []
  for (const text of texts) {
    for (const part of text.split('\n')) {
      const stripped = part.trim()
      if (stripped) items.push(stripped)
    }
  }
  return items
}

export function agreementClass(level: number | null | undefined): string {
  if (level == null || level <= 1) return 'low'
  if (level === 2) return 'medium'
  return 'high'
}

export function isEmptyCellValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim().length === 0
  return false
}

export type CurationTypeIcon = Exclude<CurationType, 'none'>

export function curationIconInfo(
  curationType: Row['curation_type_']
): { type: CurationTypeIcon; title: string } | null {
  if (curationType === 'automatic') return { type: 'automatic', title: 'Automatically curated' }
  if (curationType === 'manual') return { type: 'manual', title: 'Manually curated' }
  return null
}

export function readerEmoji(reader: string | undefined): string {
  if (!reader) return ''
  if (['pdfplumber', 'camelot', 'pymupdf'].includes(reader)) return '💻'
  if (reader.startsWith('hybrid-')) return '☯️'
  return '🤖'
}

/**
 * Converts a metadata object into [key, value] display rows.
 * `sources`, `settings`, and `agreement_method` are skipped because they are
 * rendered in dedicated UI sections rather than the general metadata table.
 * Nested objects are flattened with dot-notation keys (e.g. `config.mode`).
 */
export function flattenMetadataRows(metadata: Metadata): [string, string][] {
  const rows: [string, string][] = []

  function flattenDict(data: Record<string, unknown>, prefix: string): void {
    for (const [key, value] of Object.entries(data)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (Array.isArray(value)) {
        rows.push([fullKey, value.map((v) => String(v)).join(', ')])
      } else if (value !== null && typeof value === 'object') {
        flattenDict(value as Record<string, unknown>, fullKey)
      } else {
        rows.push([fullKey, String(value)])
      }
    }
  }

  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'sources' || key === 'settings' || key === 'agreement_method') continue
    if (Array.isArray(value)) {
      rows.push([key, value.map((v) => String(v)).join(', ')])
    } else if (value !== null && typeof value === 'object') {
      flattenDict(value as Record<string, unknown>, key)
    } else {
      rows.push([key, String(value)])
    }
  }
  return rows
}

export function findTableAnchorId(content: { tables: Table[] }, paperId: string, tableNumber: number): string | null {
  const tableIdx = tableNumber - 1
  if (tableIdx < 0 || tableIdx >= content.tables.length) return null
  const fragments = getTableFragments(content.tables[tableIdx])
  if (fragments.length > 1) return `${paperId}-table-${tableNumber}`
  const page = fragments[0]?.page
  if (page == null) return null
  return `${paperId}-table-${tableNumber}-page-${page}`
}

export function buildPaperAnchorIds(paperId: string, tables: Table[]): string[] {
  const ids: string[] = [paperId]
  tables.forEach((table, tableIdx) => {
    const fragments = getTableFragments(table)
    if (fragments.length > 1) ids.push(`${paperId}-table-${tableIdx + 1}`)
    fragments.forEach((fragment, fragmentIdx) => {
      const fragmentPart = fragments.length > 1 ? `fragment-${fragmentIdx}-` : ''
      ids.push(`${paperId}-table-${tableIdx + 1}-${fragmentPart}page-${fragment.page}`)
    })
  })
  return ids
}

export function collectPaperSourceUuids(content: { tables: Table[] }): Set<string> {
  const uuids = new Set<string>()
  for (const table of content.tables) {
    for (const fragment of getTableFragments(table)) {
      for (const row of fragment.rows) {
        for (const uid of row.sources_ ?? []) {
          uuids.add(uid)
        }
      }
    }
  }
  return uuids
}

export function shiftRowNumbers(rows: Row[], fromRowNum: number, delta: number): Row[] {
  return rows.map((row) => {
    const rowNum = row['row_'] as number | undefined;
    return rowNum != null && rowNum >= fromRowNum ? { ...row, row_: rowNum + delta } : row;
  });
}

const ROW_PALETTE_SIZE = 5

export function rowPaletteClass(row: Row): string | undefined {
  const rowNum = typeof row['row_'] === 'number' ? row['row_'] : null
  return rowNum !== null ? `row-${rowNum % ROW_PALETTE_SIZE}` : undefined
}

const OPTIONAL_META_COLS = new Set(['citation_', 'path_', 'page_', 'fragment_'])

export function columnHasData(rows: Row[], col: string): boolean {
  return rows.some((row) => {
    const value = row[col]
    if (value == null) return false
    if (Array.isArray(value)) {
      return value.some((entry) =>
        typeof entry === 'object' && entry !== null && 'value' in entry
          ? String((entry as ValueWithAgreement).value) !== ''
          : String(entry) !== ''
      )
    }
    return String(value) !== ''
  })
}

export function buildFragmentColumns(rows: Row[]): string[] {
  const hasAgreement = rows.some((r) => r.agreement_level_ != null)
  const hasSources = rows.some((r) => r.sources_ != null)
  const allColNames = columnNames(rows)
  const rowColSets = rows.map((r) => new Set(Object.keys(getRowColumns(r))))
  const commonCols = allColNames.filter((c) => rowColSets.every((s) => s.has(c)))
  const extraCols = allColNames.filter((c) => !commonCols.includes(c))
  const dataCols = [...commonCols, ...extraCols].filter(
    (c) => c !== 'row_' && (!OPTIONAL_META_COLS.has(c) || columnHasData(rows, c))
  )
  const hasRow = allColNames.includes('row_') && columnHasData(rows, 'row_')

  const cols: string[] = []
  if (hasRow) cols.push('row_')
  if (hasAgreement) cols.push('agreement_level_')
  cols.push(...dataCols)
  if (hasSources) cols.push('readers_', 'sources_')
  return cols
}

export type MultivaluedExpansion = {
  span: number
  multivaluedCols: Map<string, ValueWithAgreement[]>
}

export function getMultivaluedExpansion(row: Row, columns: string[]): MultivaluedExpansion {
  const colValues = getRowColumns(row)
  const multivaluedCols = new Map<string, ValueWithAgreement[]>()
  for (const col of columns) {
    const val = colValues[col]
    if (Array.isArray(val) && val.length > 1) {
      multivaluedCols.set(col, val as ValueWithAgreement[])
    }
  }
  const span = multivaluedCols.size > 0
    ? Math.max(...[...multivaluedCols.values()].map((v) => v.length))
    : 1
  return { span, multivaluedCols }
}

export function renderDataCell(
  row: Row,
  col: string,
  uuidToReader: Map<string, string>
): string {
  if (col === 'agreement_level_') {
    return row.agreement_level_ != null ? String(row.agreement_level_) : ''
  }
  if (col === 'readers_') {
    const sourceIds = row.sources_ ?? []
    const seen = new Set<string>()
    const readers: string[] = []
    for (const id of sourceIds) {
      const reader = uuidToReader.get(id)
      if (reader && !seen.has(reader)) {
        seen.add(reader)
        readers.push(reader)
      }
    }
    return readers.join(', ')
  }
  if (col === 'sources_') {
    return (row.sources_ ?? []).join(', ')
  }
  const colValues = getRowColumns(row)
  return renderColumnValue(colValues[col] ?? null)
}
