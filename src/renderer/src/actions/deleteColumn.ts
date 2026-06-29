import { mapTableFragments } from '../utils/mapTableFragments';
import type { TablesFile, Row, ColumnValue } from '../types';


export function deleteColumn(file: TablesFile, tableIdx: number, colName: string): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
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
