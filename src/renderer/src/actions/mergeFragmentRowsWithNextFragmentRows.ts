import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

// Combines all rows of the fragment at fragmentIdx with the next fragment's rows into a single fragment.
// Collapses to TableWithRows when only one fragment remains.
// No-op when fragmentIdx is the last fragment.
export function mergeFragmentRowsWithNextFragmentRows(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  if (fragmentIdx >= fragments.length - 1) return file;

  const mergedFragment = {
    rows: [...fragments[fragmentIdx].rows, ...fragments[fragmentIdx + 1].rows],
    page: fragments[fragmentIdx].page,
  };
  const newFragments = [
    ...fragments.slice(0, fragmentIdx),
    mergedFragment,
    ...fragments.slice(fragmentIdx + 2),
  ];

  const newTable = newFragments.length === 1
    ? { rows: newFragments[0].rows, page: newFragments[0].page, ...(table.title ? { title: table.title } : {}) }
    : { table_fragments: newFragments, ...(table.title ? { title: table.title } : {}) };

  const tables = file.tables.map((t, i) => i === tableIdx ? newTable : t);
  return { ...file, tables };
}
