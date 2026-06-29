import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames } from '../utils/table';
import type { TablesFile, Row } from '../types';


export function addRow(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  afterRowIdx?: number
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    const cols = columnNames(fragment.rows);
    const emptyRow: Row = {};
    for (const col of cols) emptyRow[col] = null;
    const insertAt = afterRowIdx !== undefined ? afterRowIdx + 1 : fragment.rows.length;
    return {
      ...fragment,
      rows: [...fragment.rows.slice(0, insertAt), emptyRow, ...fragment.rows.slice(insertAt)]
    };
  });
}
