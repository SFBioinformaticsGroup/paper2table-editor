import { mapTableFragments } from '../utils/mapTableFragments'
import type { TablesFile } from '../types'

export function clearCells(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdxs: number[],
  colNames: string[]
): TablesFile {
  const rowIdxSet = new Set(rowIdxs)
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment
    const rows = fragment.rows.map((row, ri) => {
      if (!rowIdxSet.has(ri)) return row
      const updates: Record<string, null> = {}
      for (const colName of colNames) {
        updates[colName] = null
      }
      return { ...row, ...updates }
    })
    return { ...fragment, rows }
  })
}
