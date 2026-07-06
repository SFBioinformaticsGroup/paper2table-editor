import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

// Combines the previous table's fragments with the current table's fragments into one TableWithFragments.
// No-op when tableIdx is 0.
export function mergeTableFragmentsWithPreviousTableFragments(file: TablesFile, tableIdx: number): TablesFile {
  if (tableIdx === 0) return file;
  const prevFragments = getTableFragments(file.tables[tableIdx - 1]);
  const currentFragments = getTableFragments(file.tables[tableIdx]);
  const merged = { table_fragments: [...prevFragments, ...currentFragments] };
  const tables = file.tables.flatMap((t, i) => {
    if (i === tableIdx - 1) return [merged];
    if (i === tableIdx) return [];
    return [t];
  });
  return { ...file, tables };
}
