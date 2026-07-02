import { getTableFragments } from '../utils/getTableFragments';
import { mapTableFragments } from '../utils/mapTableFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import type { TablesFile } from '../types';

export function hasNonSemanticColumns(cols: string[]): boolean {
  return cols.length > 0 && cols.every((name) => /^\d+$/.test(name));
}

export function applyPrevFragmentColumnNames(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number
): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  if (fragmentIdx <= 0 || fragmentIdx >= fragments.length) return file;

  const prevCols = columnNames(fragments[fragmentIdx - 1].rows);
  const currentCols = columnNames(fragments[fragmentIdx].rows);
  if (currentCols.length < prevCols.length) return file;

  const renameMap = new Map(prevCols.map((prevName, i) => [currentCols[i], prevName]));

  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    return {
      ...fragment,
      rows: fragment.rows.map((row) => renameRowKeys(row, renameMap)),
    };
  });
}
