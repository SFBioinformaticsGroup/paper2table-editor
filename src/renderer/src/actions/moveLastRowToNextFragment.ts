import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

export function moveLastRowToNextFragment(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  if (fragmentIdx >= fragments.length - 1) return file;
  const sourceFragment = fragments[fragmentIdx];
  if (sourceFragment.rows.length < 2) return file;

  const movedRow = sourceFragment.rows[sourceFragment.rows.length - 1];
  const newFragments = fragments.map((fragment, fi) => {
    if (fi === fragmentIdx) return { ...fragment, rows: fragment.rows.slice(0, -1) };
    if (fi === fragmentIdx + 1) return { ...fragment, rows: [movedRow, ...fragment.rows] };
    return fragment;
  });

  const rebuilt = 'table_fragments' in table
    ? { ...table, table_fragments: newFragments }
    : { rows: newFragments[0].rows, page: newFragments[0].page };
  return { ...file, tables: file.tables.map((t, i) => i === tableIdx ? rebuilt : t) };
}
