import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import type { TablesFile, Row, ColumnValue } from '../types';


export function transferColumnValues(
  file: TablesFile,
  destColName: string,
  scope: ColumnScope
): TablesFile {
  if (scope.colName === destColName) return file;
  const renameMap = new Map([[scope.colName, destColName]]);
  return mapColumnFragments(file, scope, (fragment) => {
    const destExistsInFragment = columnNames(fragment.rows).includes(destColName);

    if (!destExistsInFragment) {
      return {
        ...fragment,
        rows: fragment.rows.map((row) => renameRowKeys(row, renameMap))
      };
    }

    return {
      ...fragment,
      rows: fragment.rows.map((row) => {
        const newRow: Row = {};
        const sourceExists = scope.colName in row;
        for (const [k, v] of Object.entries(row)) {
          if (k === scope.colName) continue;
          if (k === destColName && sourceExists) {
            newRow[destColName] = row[scope.colName] as ColumnValue;
          } else {
            newRow[k] = v as ColumnValue;
          }
        }
        return newRow;
      })
    };
  });
}
