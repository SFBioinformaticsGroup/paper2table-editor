import { getTableFragments } from '../utils/getTableFragments';
import type { Table, TableFragment, TablesFile } from '../types';

// Combines the current table's fragments with the next table's fragments into one TableWithFragments.
// No-op when tableIdx is the last table.
export function mergeTableFragmentsWithNextTableFragments(file: TablesFile, tableIdx: number): TablesFile {
  if (tableIdx >= file.tables.length - 1) return file;
  const currentFragments = getTableFragments(file.tables[tableIdx]);
  const nextFragments = getTableFragments(file.tables[tableIdx + 1]);
  const merged = toTableWithFragments({ table_fragments: [...currentFragments, ...nextFragments] });
  const tables = file.tables.flatMap((t, i) => {
    if (i === tableIdx) return [];
    if (i === tableIdx + 1) return [merged];
    return [t];
  });
  return { ...file, tables };
}

function toTableWithFragments(table: Table): { table_fragments: TableFragment[] } {
  return { table_fragments: getTableFragments(table) };
}
