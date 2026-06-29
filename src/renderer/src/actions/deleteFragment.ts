import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';
import { deleteTable } from './deleteTable';


export function deleteFragment(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  const remaining = fragments.filter((_, i) => i !== fragmentIdx);
  if (remaining.length === 0) return deleteTable(file, tableIdx);
  const rebuilt = 'table_fragments' in table
    ? { ...table, table_fragments: remaining }
    : { rows: remaining[0].rows, page: remaining[0].page };
  return { ...file, tables: file.tables.map((t, i) => (i === tableIdx ? rebuilt : t)) };
}
