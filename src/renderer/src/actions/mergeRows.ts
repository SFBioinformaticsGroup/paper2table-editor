import { mapTableFragments } from '../utils/mapTableFragments';
import { renderColumnValue } from '../utils/table';
import type { TablesFile, Row, ColumnValue } from '../types';


export function mergeRows(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number,
  direction: 'next' | 'prev'
): TablesFile {
  return mapTableFragments(file, tableIdx, (fragment, fi) => {
    if (fi !== fragmentIdx) return fragment;
    const rows = fragment.rows;
    const otherIdx = direction === 'next' ? rowIdx + 1 : rowIdx - 1;
    if (otherIdx < 0 || otherIdx >= rows.length) return fragment;

    const firstIdx = Math.min(rowIdx, otherIdx);
    const secondIdx = Math.max(rowIdx, otherIdx);
    const rowA = rows[firstIdx];
    const rowB = rows[secondIdx];

    const allKeys = [...new Set([...Object.keys(rowA), ...Object.keys(rowB)])];
    const mergedRow: Row = {};

    for (const key of allKeys) {
      if (key === 'agreement_level_') {
        const levelA = rowA.agreement_level_ ?? null;
        const levelB = rowB.agreement_level_ ?? null;
        mergedRow.agreement_level_ = levelA === levelB ? levelA : null;
        continue;
      }
      if (key === 'sources_') {
        const sourcesA = rowA.sources_ ?? [];
        const sourcesB = rowB.sources_ ?? [];
        const merged = [...new Set([...sourcesA, ...sourcesB])];
        mergedRow.sources_ = merged.length > 0 ? merged : null;
        continue;
      }
      const valA = rowA[key] as ColumnValue;
      const valB = rowB[key] as ColumnValue;
      const strA = renderColumnValue(valA);
      const strB = renderColumnValue(valB);
      mergedRow[key] = strA === strB
        ? (valA ?? valB)
        : ([strA, strB].filter(Boolean).join(' ') || null);
    }

    return {
      ...fragment,
      rows: [...rows.slice(0, firstIdx), mergedRow, ...rows.slice(secondIdx + 1)]
    };
  });
}
