import { mapTableFragments } from '../utils/mapTableFragments';
import type { TablesFile, Row, ColumnValue } from '../types';

function reverseColumnValue(value: ColumnValue): ColumnValue {
  if (value === null || typeof value === 'number') return value
  if (typeof value === 'string') return value.split('').reverse().join('')
  return value.map((v) => ({ ...v, value: v.value.split('').reverse().join('') }))
}


export function reverseText(file: TablesFile, tableIdx: number): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const next: Row = {};
      for (const [k, v] of Object.entries(row)) {
        if (k === 'agreement_level_' || k === 'sources_' || k === 'readers_') {
          next[k] = v as ColumnValue;
        } else {
          next[k] = reverseColumnValue(v as ColumnValue);
        }
      }
      return next;
    })
  }));
}
