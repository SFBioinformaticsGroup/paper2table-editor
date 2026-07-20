import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { TablesFile, Row, ColumnValue } from '../types';


export function deleteColumn(
  file: TablesFile,
  tableIdx: number,
  colName: string,
  fragmentIdx: number,
  editColumnsGlobally: boolean
): TablesFile {
  return mapColumnFragments(file, tableIdx, fragmentIdx, editColumnsGlobally, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const next: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k !== colName) next[k] = v as ColumnValue;
      }
      return next;
    })
  }));
}
