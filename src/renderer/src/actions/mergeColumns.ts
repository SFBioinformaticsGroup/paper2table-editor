import { mapTableFragments } from '../utils/mapTableFragments';
import type { TablesFile, ColumnValue, Row } from '../types';
import { renderColumnValue } from '../utils/table';


export function mergeColumns(
  file: TablesFile,
  tableIdx: number,
  keepCol: string,
  dropCol: string
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const keepVal = renderColumnValue(row[keepCol] as ColumnValue);
      const dropVal = renderColumnValue(row[dropCol] as ColumnValue);
      const merged = [keepVal, dropVal].filter(Boolean).join(' ');
      const next: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === dropCol) continue;
        next[k] = k === keepCol ? merged : (v as ColumnValue);
      }
      return next;
    })
  }));
}
