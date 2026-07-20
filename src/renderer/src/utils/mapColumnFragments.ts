import { mapTableFragments } from './mapTableFragments'
import type { TablesFile, TableFragment } from '../types'


export function mapColumnFragments(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  editColumnsGlobally: boolean,
  fn: (fragment: TableFragment) => TableFragment
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (!editColumnsGlobally && fi !== fragmentIdx) return fragment
    return fn(fragment)
  })
}
