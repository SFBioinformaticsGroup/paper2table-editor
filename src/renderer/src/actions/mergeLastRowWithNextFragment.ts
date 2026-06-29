import { renderColumnValue } from '../utils/table';
import type { TablesFile, Row, ColumnValue, TableWithFragments } from '../types';

export function mergeLastRowWithNextFragment(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number
): TablesFile {
  const table = file.tables[tableIdx];
  if (!('table_fragments' in table)) return file;

  const fragments = [...(table as TableWithFragments).table_fragments];
  if (fragmentIdx < 0 || fragmentIdx >= fragments.length - 1) return file;

  const fragmentA = fragments[fragmentIdx];
  const fragmentB = fragments[fragmentIdx + 1];
  if (fragmentA.rows.length === 0 || fragmentB.rows.length === 0) return file;

  const lastRowA = fragmentA.rows[fragmentA.rows.length - 1];
  const firstRowB = fragmentB.rows[0];

  const allKeys = [...new Set([...Object.keys(lastRowA), ...Object.keys(firstRowB)])];
  const mergedRow: Row = {};

  for (const key of allKeys) {
    if (key === 'agreement_level_') {
      const levelA = lastRowA.agreement_level_ ?? null;
      const levelB = firstRowB.agreement_level_ ?? null;
      mergedRow.agreement_level_ = levelA === levelB ? levelA : null;
      continue;
    }
    if (key === 'sources_') {
      const sourcesA = lastRowA.sources_ ?? [];
      const sourcesB = firstRowB.sources_ ?? [];
      const merged = [...new Set([...sourcesA, ...sourcesB])];
      mergedRow.sources_ = merged.length > 0 ? merged : null;
      continue;
    }
    const valA = lastRowA[key] as ColumnValue;
    const valB = firstRowB[key] as ColumnValue;
    const strA = renderColumnValue(valA);
    const strB = renderColumnValue(valB);
    mergedRow[key] = strA === strB
      ? (valA ?? valB)
      : ([strA, strB].filter(Boolean).join(' ') || null);
  }

  fragments[fragmentIdx] = {
    ...fragmentA,
    rows: [...fragmentA.rows.slice(0, -1), mergedRow],
  };
  fragments[fragmentIdx + 1] = {
    ...fragmentB,
    rows: fragmentB.rows.slice(1),
  };

  const newTables = [...file.tables];
  newTables[tableIdx] = { ...table, table_fragments: fragments } as TableWithFragments;
  return { ...file, tables: newTables };
}
