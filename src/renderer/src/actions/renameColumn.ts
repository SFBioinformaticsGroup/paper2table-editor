import { getTableFragments } from '../utils/getTableFragments';
import { mapColumnFragments } from '../utils/mapColumnFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile } from '../types';


export function renameColumn(
  file: TablesFile,
  tableIdx: number,
  oldName: string,
  newName: string,
  fragmentIdx: number,
  editColumnsGlobally: boolean
): TablesFile {
  const table = file.tables[tableIdx];
  const allCols = new Set(
    getTableFragments(table).flatMap((f) => columnNames(f.rows))
  );
  allCols.delete(oldName);
  const safeName = uniqueName(newName, allCols);
  const renameMap = new Map([[oldName, safeName]]);
  return mapColumnFragments(file, tableIdx, fragmentIdx, editColumnsGlobally, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => renameRowKeys(row, renameMap))
  }));
}
