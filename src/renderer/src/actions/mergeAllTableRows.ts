import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

// Flattens all fragments of a table into a single TableWithRows.
export function mergeAllTableRows(file: TablesFile, tableIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  const allRows = fragments.flatMap((f) => f.rows);
  const page = fragments[0]?.page ?? 0;
  const tables = file.tables.map((t, i) => i === tableIdx ? { rows: allRows, page } : t);
  return { ...file, tables };
}
