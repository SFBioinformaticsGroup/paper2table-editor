import { getTableFragments } from '../utils/getTableFragments';
import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';


export function duplicateColumn(
  file: TablesFile,
  tableIdx: number,
  colName: string
): TablesFile {
  const table = file.tables[tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const newName = uniqueName(colName, allCols);
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const newRow: Row = {};
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = v as ColumnValue;
        if (k === colName) {
          newRow[newName] = v as ColumnValue;
        }
      }
      return newRow;
    })
  }));
}
