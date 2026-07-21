import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import type { TablesFile, Row, ColumnValue } from '../types';


export function deleteColumn(
  file: TablesFile,
  scope: ColumnScope
): TablesFile {
  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const next: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k !== scope.colName) next[k] = v as ColumnValue;
      }
      return next;
    })
  }));
}
