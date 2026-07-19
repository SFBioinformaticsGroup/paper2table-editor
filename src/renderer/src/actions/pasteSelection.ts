import { mapTableFragments } from '../utils/mapTableFragments'
import { columnNames } from '../utils/table'
import type { TablesFile } from '../types'

const META_COL_SET = new Set(['row_', 'agreement_level_', 'readers_', 'sources_'])

export function pasteSelection(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  anchorRowIdx: number,
  anchorColName: string,
  cells: string[][]
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment
    const editableCols = columnNames(fragment.rows).filter((c) => !META_COL_SET.has(c))
    const anchorColIdx = editableCols.indexOf(anchorColName)
    if (anchorColIdx === -1) return fragment
    const rows = fragment.rows.map((row, ri) => {
      const rowOffset = ri - anchorRowIdx
      if (rowOffset < 0 || rowOffset >= cells.length) return row
      const cellRow = cells[rowOffset]
      const updates: Record<string, string | null> = {}
      for (let colOffset = 0; colOffset < cellRow.length; colOffset++) {
        const targetColIdx = anchorColIdx + colOffset
        if (targetColIdx >= editableCols.length) continue
        const colName = editableCols[targetColIdx]
        updates[colName] = cellRow[colOffset] || null
      }
      return { ...row, ...updates }
    })
    return { ...fragment, rows }
  })
}
