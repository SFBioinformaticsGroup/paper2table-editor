import { getTableFragments } from '../utils/getTableFragments';
import type { TablesFile } from '../types';

export function moveFirstRowToPrevFragment(file: TablesFile, tableIdx: number, fragmentIdx: number): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  if (fragmentIdx <= 0) return file;
  const sourceFragment = fragments[fragmentIdx];
  if (sourceFragment.rows.length < 2) return file;

  const movedRow = sourceFragment.rows[0];
  const newFragments = fragments.map((fragment, fi) => {
    if (fi === fragmentIdx - 1) return { ...fragment, rows: [...fragment.rows, movedRow] };
    if (fi === fragmentIdx) return { ...fragment, rows: fragment.rows.slice(1) };
    return fragment;
  });

  const rebuilt = 'table_fragments' in table
    ? { ...table, table_fragments: newFragments }
    : { rows: newFragments[0].rows, page: newFragments[0].page };
  return { ...file, tables: file.tables.map((t, i) => i === tableIdx ? rebuilt : t) };
}
