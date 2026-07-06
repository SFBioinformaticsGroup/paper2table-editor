import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

// Combines all fragments from all tables into a single TableWithFragments.
// No-op when there is only one table.
export function mergeAllFragments(file: TablesFile): TablesFile {
  if (file.tables.length <= 1) return file;
  const allFragments = file.tables.flatMap((t) => getTableFragments(t));
  return { ...file, tables: [{ table_fragments: allFragments }] };
}
