import { Row, ColumnValue, Citation, Metadata, Table } from '@renderer/types';
import { getTableFragments } from './getTableFragments';

export function getRowColumns(row: Row): Record<string, ColumnValue> {
  const result: Record<string, ColumnValue> = {}
  for (const [key, val] of Object.entries(row)) {
    if (key !== 'agreement_level_' && key !== 'sources_') {
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
      if (key !== 'agreement_level_' && key !== 'sources_' && !seen.has(key)) {
        seen.add(key)
        result.push(key)
      }
    }
  }
  return result
}

export function isEmptyRow(row: Row): boolean {
  for (const [key, val] of Object.entries(row)) {
    if (key === 'agreement_level_' || key === 'sources_') continue
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

export function renderCitation(citation: Citation | undefined): string {
  if (citation == null) return ''
  if (Array.isArray(citation)) return citation.map((v) => v.value).join(', ')
  return citation
}

export function agreementClass(level: number | null | undefined): string {
  if (level == null || level <= 1) return 'low'
  if (level === 2) return 'medium'
  return 'high'
}

export function readerEmoji(reader: string | undefined): string {
  if (!reader) return ''
  if (['pdfplumber', 'camelot', 'pymupdf'].includes(reader)) return '💻'
  if (reader.startsWith('hybrid-')) return '☯️'
  return '🤖'
}

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
      flattenDict(value as Record<string, unknown>, '')
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
    for (const fragment of fragments) {
      ids.push(`${paperId}-table-${tableIdx + 1}-page-${fragment.page}`)
    }
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

const ROW_PALETTE_SIZE = 5

export function rowPaletteClass(row: Row): string | undefined {
  const rowNum = typeof row['row_'] === 'number' ? row['row_'] : null
  return rowNum !== null ? `row-${rowNum % ROW_PALETTE_SIZE}` : undefined
}

export function buildFragmentColumns(rows: Row[]): string[] {
  const hasAgreement = rows.some((r) => r.agreement_level_ != null)
  const hasSources = rows.some((r) => r.sources_ != null)
  const allColNames = columnNames(rows)
  const rowColSets = rows.map((r) => new Set(Object.keys(getRowColumns(r))))
  const commonCols = allColNames.filter((c) => rowColSets.every((s) => s.has(c)))
  const extraCols = allColNames.filter((c) => !commonCols.includes(c))
  const dataCols = [...commonCols, ...extraCols].filter((c) => c !== 'row_')
  const hasRow = allColNames.includes('row_')

  const cols: string[] = []
  if (hasRow) cols.push('row_')
  if (hasAgreement) cols.push('agreement_level_')
  cols.push(...dataCols)
  if (hasSources) cols.push('readers_', 'sources_')
  return cols
}

export function computeRowspans(
  rows: Row[],
  columns: string[],
  uuidToReader: Map<string, string>
): Array<Record<string, number>> {
  const n = rows.length
  const rowspans: Array<Record<string, number>> = rows.map(() =>
    Object.fromEntries(columns.map((col) => [col, 1]))
  )
  for (const col of columns) {
    if (col === 'agreement_level_') continue
    let i = 0
    while (i < n) {
      const rowNum = typeof rows[i]['row_'] === 'number' ? rows[i]['row_'] : null
      if (rowNum === null) {
        i++
        continue
      }
      const val = renderDataCell(rows[i], col, uuidToReader)
      let span = 1
      let j = i + 1
      while (
        j < n &&
        rows[j]['row_'] === rowNum &&
        renderDataCell(rows[j], col, uuidToReader) === val
      ) {
        span++
        j++
      }
      if (span > 1) {
        rowspans[i][col] = span
        for (let k = i + 1; k < i + span; k++) {
          rowspans[k][col] = 0
        }
      }
      i += span
    }
  }
  return rowspans
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
