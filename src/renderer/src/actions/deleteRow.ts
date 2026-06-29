import { mapTableFragments } from '../utils/mapTableFragments';
import type { TablesFile } from '../types';


export function deleteRow(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    return { ...fragment, rows: fragment.rows.filter((_, ri) => ri !== rowIdx) };
  });
}
