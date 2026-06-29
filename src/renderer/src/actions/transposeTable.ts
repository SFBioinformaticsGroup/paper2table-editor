import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames, renderColumnValue } from '../utils/table';
import type { TablesFile, Row, ColumnValue } from '../types';


export function transposeTable(file: TablesFile, tableIdx: number): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => {
    const cols = columnNames(fragment.rows);
    if (cols.length === 0) return fragment;
    const rowCount = fragment.rows.length;
    const newRows: Row[] = cols.map((col) => {
      const row: Row = { '0': col };
      for (let ri = 0; ri < rowCount; ri++) {
        row[String(ri + 1)] = renderColumnValue(fragment.rows[ri][col] as ColumnValue);
      }
      return row;
    });
    return { ...fragment, rows: newRows };
  });
}
