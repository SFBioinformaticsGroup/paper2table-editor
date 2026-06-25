import type { ColumnValue, Row, Table, TableFragment, TablesFile } from './types'
import { columnNames, getTableFragments, renderColumnValue } from './tableUtils'

function tableToFragments(table: Table): { table_fragments: TableFragment[] } {
  return { table_fragments: getTableFragments(table) }
}

function mapTableFragments(
  file: TablesFile,
  tableIdx: number,
  fn: (fragment: TableFragment, fragmentIdx: number) => TableFragment
): TablesFile {
  const tables = file.tables.map((table, ti) => {
    if (ti !== tableIdx) return table
    const fragments = getTableFragments(table).map(fn)
    if ('table_fragments' in table) return { table_fragments: fragments }
    // was TableWithRows — if single fragment keep that shape, else upgrade
    if (fragments.length === 1) return { rows: fragments[0].rows, page: fragments[0].page }
    return { table_fragments: fragments }
  })
  return { ...file, tables }
}

function renameRowKeys(row: Row, renameMap: Map<string, string>): Row {
  const next: Row = {}
  if (row.agreement_level_ !== undefined) next.agreement_level_ = row.agreement_level_
  if (row.sources_ !== undefined) next.sources_ = row.sources_
  for (const [key, val] of Object.entries(row)) {
    if (key === 'agreement_level_' || key === 'sources_') continue
    const newKey = renameMap.get(key) ?? key
    next[newKey] = val as ColumnValue
  }
  return next
}

export function deleteTable(file: TablesFile, tableIdx: number): TablesFile {
  return { ...file, tables: file.tables.filter((_, i) => i !== tableIdx) }
}

export function deleteFragment(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx]
  const fragments = getTableFragments(table)
  const remaining = fragments.filter((_, i) => i !== fragmentIdx)
  if (remaining.length === 0) return deleteTable(file, tableIdx)
  const rebuilt =
    'table_fragments' in table
      ? { ...table, table_fragments: remaining }
      : { rows: remaining[0].rows, page: remaining[0].page }
  return { ...file, tables: file.tables.map((t, i) => (i === tableIdx ? rebuilt : t)) }
}

export function compactFragments(file: TablesFile, tableIdx: number): TablesFile {
  const table = file.tables[tableIdx]
  const fragments = getTableFragments(table)
  const allRows = fragments.flatMap((f) => f.rows)
  const page = fragments[0]?.page ?? 0
  const tables = file.tables.map((t, i) =>
    i === tableIdx ? { rows: allRows, page } : t
  )
  return { ...file, tables }
}

export function mergeWithNextTable(file: TablesFile, tableIdx: number): TablesFile {
  if (tableIdx >= file.tables.length - 1) return file
  const currentFragments = getTableFragments(file.tables[tableIdx])
  const nextFragments = getTableFragments(file.tables[tableIdx + 1])
  const merged = tableToFragments({ table_fragments: [...currentFragments, ...nextFragments] })
  const tables = file.tables.flatMap((t, i) => {
    if (i === tableIdx) return []
    if (i === tableIdx + 1) return [merged]
    return [t]
  })
  return { ...file, tables }
}

export function deleteRow(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment
    return { ...fragment, rows: fragment.rows.filter((_, ri) => ri !== rowIdx) }
  })
}

export function promoteRowToHeader(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number
): TablesFile {
  const table = file.tables[tableIdx]
  const fragments = getTableFragments(table)
  const sourceRow = fragments[fragmentIdx].rows[rowIdx]
  const oldNames = columnNames([sourceRow])

  const renameMap = new Map<string, string>()
  for (const oldName of oldNames) {
    const raw = renderColumnValue(sourceRow[oldName] as ColumnValue)
    renameMap.set(oldName, raw.trim() !== '' ? raw.trim() : oldName)
  }

  const newFragments = fragments.map((fragment, fi) => ({
    ...fragment,
    rows: fragment.rows
      .filter((_, ri) => fi !== fragmentIdx || ri !== rowIdx)
      .map((row) => renameRowKeys(row, renameMap))
  }))

  const rebuiltTable =
    'table_fragments' in table
      ? { table_fragments: newFragments }
      : newFragments.length === 1
        ? { rows: newFragments[0].rows, page: newFragments[0].page }
        : { table_fragments: newFragments }

  return {
    ...file,
    tables: file.tables.map((t, i) => (i === tableIdx ? rebuiltTable : t))
  }
}

export function deleteColumn(file: TablesFile, tableIdx: number, colName: string): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const next: Row = {}
      for (const [k, v] of Object.entries(row)) {
        if (k !== colName) next[k] = v as ColumnValue
      }
      return next
    })
  }))
}

function uniqueName(desired: string, existing: Set<string>): string {
  if (!existing.has(desired)) return desired
  let i = 2
  while (existing.has(`${desired}_${i}`)) i++
  return `${desired}_${i}`
}

export function renameColumn(
  file: TablesFile,
  tableIdx: number,
  oldName: string,
  newName: string
): TablesFile {
  const table = file.tables[tableIdx]
  const allCols = new Set(
    getTableFragments(table).flatMap((f) => columnNames(f.rows))
  )
  allCols.delete(oldName)
  const safeName = uniqueName(newName, allCols)
  const renameMap = new Map([[oldName, safeName]])
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => renameRowKeys(row, renameMap))
  }))
}

export function mergeColumns(
  file: TablesFile,
  tableIdx: number,
  keepCol: string,
  dropCol: string
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const keepVal = renderColumnValue(row[keepCol] as ColumnValue)
      const dropVal = renderColumnValue(row[dropCol] as ColumnValue)
      const merged = [keepVal, dropVal].filter(Boolean).join(' ')
      const next: Row = {}
      for (const [k, v] of Object.entries(row)) {
        if (k === dropCol) continue
        next[k] = k === keepCol ? merged : (v as ColumnValue)
      }
      return next
    })
  }))
}

export function mergeRows(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  direction: 'next' | 'prev'
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment
    const rows = fragment.rows
    const otherIdx = direction === 'next' ? rowIdx + 1 : rowIdx - 1
    if (otherIdx < 0 || otherIdx >= rows.length) return fragment

    const firstIdx = Math.min(rowIdx, otherIdx)
    const secondIdx = Math.max(rowIdx, otherIdx)
    const rowA = rows[firstIdx]
    const rowB = rows[secondIdx]

    const allKeys = [...new Set([...Object.keys(rowA), ...Object.keys(rowB)])]
    const mergedRow: Row = {}

    for (const key of allKeys) {
      if (key === 'agreement_level_') {
        const levelA = rowA.agreement_level_ ?? null
        const levelB = rowB.agreement_level_ ?? null
        mergedRow.agreement_level_ = levelA === levelB ? levelA : null
        continue
      }
      if (key === 'sources_') {
        const sourcesA = rowA.sources_ ?? []
        const sourcesB = rowB.sources_ ?? []
        const merged = [...new Set([...sourcesA, ...sourcesB])]
        mergedRow.sources_ = merged.length > 0 ? merged : null
        continue
      }
      const valA = rowA[key] as ColumnValue
      const valB = rowB[key] as ColumnValue
      const strA = renderColumnValue(valA)
      const strB = renderColumnValue(valB)
      mergedRow[key] = strA === strB
        ? (valA ?? valB)
        : ([strA, strB].filter(Boolean).join(' ') || null)
    }

    return {
      ...fragment,
      rows: [...rows.slice(0, firstIdx), mergedRow, ...rows.slice(secondIdx + 1)]
    }
  })
}

export function transposeTable(file: TablesFile, tableIdx: number): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => {
    const cols = columnNames(fragment.rows)
    if (cols.length === 0) return fragment
    const rowCount = fragment.rows.length
    const newRows: Row[] = cols.map((col) => {
      const row: Row = { '0': col }
      for (let ri = 0; ri < rowCount; ri++) {
        row[String(ri + 1)] = renderColumnValue(fragment.rows[ri][col] as ColumnValue)
      }
      return row
    })
    return { ...fragment, rows: newRows }
  })
}

function reverseColumnValue(value: ColumnValue): ColumnValue {
  if (value === null || typeof value === 'number') return value
  if (typeof value === 'string') return value.split('').reverse().join('')
  return value.map((v) => ({ ...v, value: v.value.split('').reverse().join('') }))
}

export function reverseText(file: TablesFile, tableIdx: number): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const next: Row = {}
      for (const [k, v] of Object.entries(row)) {
        if (k === 'agreement_level_' || k === 'sources_' || k === 'readers_') {
          next[k] = v as ColumnValue
        } else {
          next[k] = reverseColumnValue(v as ColumnValue)
        }
      }
      return next
    })
  }))
}

export function editCell(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  colName: string,
  newValue: string
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment
    return {
      ...fragment,
      rows: fragment.rows.map((row, ri) => {
        if (ri !== rowIdx) return row
        return { ...row, [colName]: newValue }
      })
    }
  })
}
