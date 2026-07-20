import { mapColumnFragments } from '../utils/mapColumnFragments'
import type { TablesFile } from '../types'

export function clearColumn(
  file: TablesFile,
  tableIdx: number,
  colName: string,
  fragmentIdx: number,
  editColumnsGlobally: boolean
): TablesFile {
  return mapColumnFragments(file, tableIdx, fragmentIdx, editColumnsGlobally, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => ({ ...row, [colName]: null }))
  }))
}
