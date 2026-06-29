import { getTableFragments } from '../utils/getTableFragments';
import { mapTableFragments } from '../utils/mapTableFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile } from '../types';


export function renameColumn(
  file: TablesFile,
  tableIdx: number,
  oldName: string,
  newName: string
): TablesFile {
  const table = file.tables[tableIdx];
  const allCols = new Set(
    getTableFragments(table).flatMap((f) => columnNames(f.rows))
  );
  allCols.delete(oldName);
  const safeName = uniqueName(newName, allCols);
  const renameMap = new Map([[oldName, safeName]]);
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => renameRowKeys(row, renameMap))
  }));
}
