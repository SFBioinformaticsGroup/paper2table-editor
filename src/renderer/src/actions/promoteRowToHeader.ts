import { getTableFragments } from '../utils/getTableFragments';
import { renameRowKeys } from '../utils/renameRowKeys';
import { columnNames, renderColumnValue } from '../utils/table';
import type { TablesFile, ColumnValue } from '../types';


export function promoteRowToHeader(
  file: TablesFile,
  tableIdx: number,
  fragmentIdx: number,
  rowIdx: number
): TablesFile {
  const table = file.tables[tableIdx];
  const fragments = getTableFragments(table);
  const sourceRow = fragments[fragmentIdx].rows[rowIdx];
  const oldNames = columnNames([sourceRow]);

  const renameMap = new Map<string, string>();
  for (const oldName of oldNames) {
    const raw = renderColumnValue(sourceRow[oldName] as ColumnValue);
    renameMap.set(oldName, raw.trim() !== '' ? raw.trim() : oldName);
  }

  const newFragments = fragments.map((fragment, fi) => ({
    ...fragment,
    rows: fragment.rows
      .filter((_, ri) => fi !== fragmentIdx || ri !== rowIdx)
      .map((row) => renameRowKeys(row, renameMap))
  }));

  const rebuiltTable = 'table_fragments' in table
    ? { table_fragments: newFragments }
    : newFragments.length === 1
      ? { rows: newFragments[0].rows, page: newFragments[0].page }
      : { table_fragments: newFragments };

  return {
    ...file,
    tables: file.tables.map((t, i) => (i === tableIdx ? rebuiltTable : t))
  };
}
