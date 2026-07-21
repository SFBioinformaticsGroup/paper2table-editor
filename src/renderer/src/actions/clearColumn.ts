import { mapColumnFragments } from '../utils/mapColumnFragments'
import type { ColumnScope } from '../utils/mapColumnFragments'
import type { TablesFile } from '../types'

export function clearColumn(
  file: TablesFile,
  scope: ColumnScope
): TablesFile {
  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => ({ ...row, [scope.colName]: null }))
  }))
}
