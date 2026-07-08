import { getTableFragments } from '../utils/getTableFragments'
import type { TablesFile, TableFragment, TableWithFragments } from '../types'

export function breakFragment(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  newPage: number
): TablesFile {
  const table = file.tables[tableIdx]
  const fragments = getTableFragments(table)
  const fragment = fragments[fragmentIdx]

  const headFragment: TableFragment = { ...fragment, rows: fragment.rows.slice(0, rowIdx) }
  const tailFragment: TableFragment = { rows: fragment.rows.slice(rowIdx), page: newPage }

  const updatedFragments = [
    ...fragments.slice(0, fragmentIdx),
    headFragment,
    tailFragment,
    ...fragments.slice(fragmentIdx + 1)
  ]

  const rebuilt: TableWithFragments = table.title !== undefined
    ? { table_fragments: updatedFragments, title: table.title }
    : { table_fragments: updatedFragments }

  return { ...file, tables: file.tables.map((t, i) => i === tableIdx ? rebuilt : t) }
}
