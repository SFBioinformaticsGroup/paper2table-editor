import { mapTableFragments } from '../utils/mapTableFragments';
import { renderColumnValue } from '../utils/table';
import type { TablesFile, ColumnValue } from '../types';


export function replicateCell(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  colName: string
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    const rows = fragment.rows;
    const sourceValue = renderColumnValue(rows[rowIdx][colName] as ColumnValue);
    let fillEnd = rowIdx + 1;
    while (fillEnd < rows.length && renderColumnValue(rows[fillEnd][colName] as ColumnValue) === '') {
      fillEnd++;
    }
    if (fillEnd === rowIdx + 1) return fragment;
    const newRows = rows.map((row, ri) => {
      if (ri <= rowIdx || ri >= fillEnd) return row;
      return { ...row, [colName]: sourceValue };
    });
    return { ...fragment, rows: newRows };
  });
}
