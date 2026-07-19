import { mapTableFragments } from '../utils/mapTableFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames } from '../utils/table';
import type { TablesFile, Row, ColumnValue } from '../types';


export function transferColumnValues(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  sourceColName: string,
  destColName: string
): TablesFile {
  if (sourceColName === destColName) return file;
  const renameMap = new Map([[sourceColName, destColName]]);
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
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
        const sourceExists = sourceColName in row;
        for (const [k, v] of Object.entries(row)) {
          if (k === sourceColName) continue;
          if (k === destColName && sourceExists) {
            newRow[destColName] = row[sourceColName] as ColumnValue;
          } else {
            newRow[k] = v as ColumnValue;
          }
        }
        return newRow;
      })
    };
  });
}
