import { mapTableFragments } from '../utils/mapTableFragments';
import { shiftRowNumbers } from '../utils/table';
import type { TablesFile, Row } from '../types';


export function duplicateRow(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    const sourceRow = fragment.rows[rowIdx];
    const sourceRowNum = typeof sourceRow['row_'] === 'number' ? sourceRow['row_'] : undefined;

    const shiftedRows = sourceRowNum !== undefined
      ? shiftRowNumbers(fragment.rows, sourceRowNum + 1, 1)
      : fragment.rows;

    const newRow: Row = sourceRowNum !== undefined
      ? { ...shiftedRows[rowIdx], row_: sourceRowNum + 1 }
      : { ...shiftedRows[rowIdx] };

    return {
      ...fragment,
      rows: [
        ...shiftedRows.slice(0, rowIdx + 1),
        newRow,
        ...shiftedRows.slice(rowIdx + 1)
      ]
    };
  });
}
