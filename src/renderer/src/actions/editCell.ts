import { mapTableFragments } from '../utils/mapTableFragments';
import type { TablesFile } from '../types';


export function editCell(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  colName: string,
  newValue: string
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    return {
      ...fragment,
      rows: fragment.rows.map((row, ri) => {
        if (ri !== rowIdx) return row;
        return { ...row, [colName]: newValue };
      })
    };
  });
}
