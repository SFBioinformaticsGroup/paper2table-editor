import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import type { TablesFile, ColumnValue, Row } from '../types';
import { renderColumnValue } from '../utils/table';


export function mergeColumns(
  file: TablesFile,
  dropCol: string,
  separator = ' ',
  scope: ColumnScope
): TablesFile {
  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const keepVal = renderColumnValue(row[scope.colName] as ColumnValue);
      const dropVal = renderColumnValue(row[dropCol] as ColumnValue);
      const merged = [keepVal, dropVal].filter(Boolean).join(separator);
      const next: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === dropCol) continue;
        next[k] = k === scope.colName ? merged : (v as ColumnValue);
      }
      return next;
    })
  }));
}
