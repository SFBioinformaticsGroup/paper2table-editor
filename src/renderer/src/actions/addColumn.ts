import { getTableFragments } from '../utils/getTableFragments';
import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';


export function addColumn(
  file: TablesFile,
  tableIdx: number,
  columnName: string,
  afterColName?: string
): TablesFile {
  const table = file.tables[tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const safeName = uniqueName(columnName, allCols);
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const newRow: Row = {};
      let inserted = false;
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = v as ColumnValue;
        if (!inserted && k === afterColName) {
          newRow[safeName] = null;
          inserted = true;
        }
      }
      if (!inserted) newRow[safeName] = null;
      return newRow;
    })
  }));
}
