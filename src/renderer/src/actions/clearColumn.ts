import { getTableFragments } from '../utils/getTableFragments'
import { clearCells } from './clearCells'
import type { TablesFile } from '../types'

export function clearColumn(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  colName: string
): TablesFile {
  const fragments = getTableFragments(file.tables[tableIdx])
  const rowIdxs = fragments[fragmentIdx].rows.map((_, i) => i)
  return clearCells(file, tableIdx, fragmentIdx, rowIdxs, [colName])
}
