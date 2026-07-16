import { mapTableFragments } from '../utils/mapTableFragments';
import { columnNames, isEmptyRow, renderColumnValue } from '../utils/table';
import type { TablesFile, Row, TableFragment, ColumnValue } from '../types';

function isGroupHeaderRow(row: Row, cols: string[]): boolean {
  if (cols.length === 0) return false;
  const firstColValue = renderColumnValue((row[cols[0]] ?? null) as ColumnValue);
  if (firstColValue === '') return false;
  if (firstColValue !== firstColValue.toUpperCase()) return false;
  if (!/[A-Za-z]/.test(firstColValue)) return false;
  for (let i = 1; i < cols.length; i++) {
    if (renderColumnValue((row[cols[i]] ?? null) as ColumnValue) !== '') return false;
  }
  return true;
}

function deaggregateFragment(fragment: TableFragment): TableFragment {
  const cols = columnNames(fragment.rows);
  if (cols.length === 0) return fragment;

  const firstCol = cols[0];
  let currentTitle: ColumnValue = null;
  const newRows: Row[] = [];

  for (const row of fragment.rows) {
    if (isEmptyRow(row)) continue;
    if (isGroupHeaderRow(row, cols)) {
      currentTitle = (row[firstCol] ?? null) as ColumnValue;
    } else if (currentTitle !== null) {
      newRows.push({ group: currentTitle, ...row });
    } else {
      newRows.push({ group: null, ...row });
    }
  }

  return { ...fragment, rows: newRows };
}

export function deaggregateTitleRows(file: TablesFile, tableIdx: number): TablesFile {
  return mapTableFragments(file, tableIdx, deaggregateFragment);
}
