import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

// Combines all rows of the previous fragment with the current fragment's rows into a single fragment.
// Collapses to TableWithRows when only one fragment remains.
// No-op when fragmentIdx is 0.
export function mergeFragmentRowsWithPreviousFragmentRows(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  if (fragmentIdx === 0) return file;

  const mergedFragment = {
    rows: [...fragments[fragmentIdx - 1].rows, ...fragments[fragmentIdx].rows],
    page: fragments[fragmentIdx - 1].page,
  };
  const newFragments = [
    ...fragments.slice(0, fragmentIdx - 1),
    mergedFragment,
    ...fragments.slice(fragmentIdx + 1),
  ];

  const newTable = newFragments.length === 1
    ? { rows: newFragments[0].rows, page: newFragments[0].page, ...(table.title ? { title: table.title } : {}) }
    : { table_fragments: newFragments, ...(table.title ? { title: table.title } : {}) };

  const tables = file.tables.map((t, i) => i === tableIdx ? newTable : t);
  return { ...file, tables };
}
