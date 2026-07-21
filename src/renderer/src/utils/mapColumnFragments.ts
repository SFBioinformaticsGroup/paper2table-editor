import { mapTableFragments } from './mapTableFragments'
import type { TablesFile, TableFragment } from '../types'


export interface ColumnScope {
  tableIdx: number
  fragmentIdx: number
  colName: string
  editColumnsGlobally: boolean
}

export function mapColumnFragments(
  file: TablesFile,
  scope: ColumnScope,
  fn: (fragment: TableFragment) => TableFragment
): TablesFile {
  return mapTableFragments(file, scope.tableIdx, (fragment, fi) => {
    if (!scope.editColumnsGlobally && fi !== scope.fragmentIdx) return fragment
    return fn(fragment)
  })
}
