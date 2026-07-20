import { getTableFragments } from '../utils/getTableFragments';
import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames, renderColumnValue } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';


export function splitColumn(file: TablesFile, tableIdx: number, colName: string): TablesFile {
  const table = file.tables[tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const tailName = uniqueName(`${colName}_tail`, allCols);

  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const rendered = renderColumnValue(row[colName] as ColumnValue);
      const lastCommaIdx = rendered.lastIndexOf(',');
      const head = lastCommaIdx >= 0 ? rendered.slice(0, lastCommaIdx).trim() : rendered;
      const tail = lastCommaIdx >= 0 ? rendered.slice(lastCommaIdx + 1).trim() : null;
      const newRow: Row = {};
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = k === colName ? (head || null) : (v as ColumnValue);
        if (k === colName) {
          newRow[tailName] = tail || null;
        }
      }
      return newRow;
    })
  }));
}
