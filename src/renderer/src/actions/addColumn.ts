import { getTableFragments } from '../utils/getTableFragments';
import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';


export function addColumn(
  file: TablesFile,
  columnName: string,
  scope: ColumnScope
): TablesFile {
  const table = file.tables[scope.tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const safeName = uniqueName(columnName, allCols);
  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const newRow: Row = {};
      let inserted = false;
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = v as ColumnValue;
        if (!inserted && k === scope.colName) {
          newRow[safeName] = null;
          inserted = true;
        }
      }
      if (!inserted) newRow[safeName] = null;
      return newRow;
    })
  }));
}
