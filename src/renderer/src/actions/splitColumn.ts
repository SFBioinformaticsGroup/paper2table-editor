import { getTableFragments } from '../utils/getTableFragments';
import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import { columnNames, renderColumnValue } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';


export function splitColumn(
  file: TablesFile,
  scope: ColumnScope
): TablesFile {
  const table = file.tables[scope.tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const tailName = uniqueName(`${scope.colName}_tail`, allCols);

  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const rendered = renderColumnValue(row[scope.colName] as ColumnValue);
      const lastCommaIdx = rendered.lastIndexOf(',');
      const head = lastCommaIdx >= 0 ? rendered.slice(0, lastCommaIdx).trim() : rendered;
      const tail = lastCommaIdx >= 0 ? rendered.slice(lastCommaIdx + 1).trim() : null;
      const newRow: Row = {};
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = k === scope.colName ? (head || null) : (v as ColumnValue);
        if (k === scope.colName) {
          newRow[tailName] = tail || null;
        }
      }
      return newRow;
    })
  }));
}
