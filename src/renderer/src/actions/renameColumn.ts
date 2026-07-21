import { getTableFragments } from '../utils/getTableFragments';
import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile } from '../types';


export function renameColumn(
  file: TablesFile,
  newName: string,
  scope: ColumnScope
): TablesFile {
  const table = file.tables[scope.tableIdx];
  const allCols = new Set(
    getTableFragments(table).flatMap((f) => columnNames(f.rows))
  );
  allCols.delete(scope.colName);
  const safeName = uniqueName(newName, allCols);
  const renameMap = new Map([[scope.colName, safeName]]);
  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => renameRowKeys(row, renameMap))
  }));
}
