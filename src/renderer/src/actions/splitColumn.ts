import { getTableFragments } from '../utils/getTableFragments';
import { mapColumnFragments } from '../utils/mapColumnFragments';
import type { ColumnScope } from '../utils/mapColumnFragments';
import { columnNames, renderColumnValue } from '../utils/table';
import { uniqueName } from '../utils/uniqueName';
import type { TablesFile, Row, ColumnValue } from '../types';

export type SplitStrategy = 'comma' | 'parentheses' | 'period' | 'slash'

function splitValue(rendered: string, strategy: SplitStrategy): { head: string | null; tail: string | null } {
  if (strategy === 'comma') {
    const lastIdx = rendered.lastIndexOf(',')
    if (lastIdx < 0) return { head: rendered.trim() || null, tail: null }
    return {
      head: rendered.slice(0, lastIdx).trim() || null,
      tail: rendered.slice(lastIdx + 1).trim() || null,
    }
  }

  if (strategy === 'parentheses') {
    const closeIdx = rendered.lastIndexOf(')')
    const openIdx = closeIdx >= 0 ? rendered.lastIndexOf('(', closeIdx) : -1
    if (closeIdx < 0 || openIdx < 0) return { head: rendered.trim() || null, tail: null }
    return {
      head: rendered.slice(0, openIdx).trim() || null,
      tail: rendered.slice(openIdx + 1, closeIdx).trim() || null,
    }
  }

  if (strategy === 'period') {
    const stripped = rendered.replace(/\.+$/, '')
    const lastIdx = stripped.lastIndexOf('.')
    if (lastIdx < 0) return { head: stripped.trim() || null, tail: null }
    return {
      head: stripped.slice(0, lastIdx).trim() || null,
      tail: stripped.slice(lastIdx + 1).trim() || null,
    }
  }

  // slash
  const stripped = rendered.replace(/\/+$/, '')
  const lastIdx = stripped.lastIndexOf('/')
  if (lastIdx < 0) return { head: stripped.trim() || null, tail: null }
  return {
    head: stripped.slice(0, lastIdx).trim() || null,
    tail: stripped.slice(lastIdx + 1).trim() || null,
  }
}

export function splitColumn(
  file: TablesFile,
  scope: ColumnScope,
  strategy: SplitStrategy
): TablesFile {
  const table = file.tables[scope.tableIdx];
  const allCols = new Set(getTableFragments(table).flatMap((f) => columnNames(f.rows)));
  const tailName = uniqueName(`${scope.colName}_tail`, allCols);

  return mapColumnFragments(file, scope, (fragment) => ({
    ...fragment,
    rows: fragment.rows.map((row) => {
      const rendered = renderColumnValue(row[scope.colName] as ColumnValue);
      const { head, tail } = splitValue(rendered, strategy);
      const newRow: Row = {};
      for (const [k, v] of Object.entries(row)) {
        newRow[k] = k === scope.colName ? head : (v as ColumnValue);
        if (k === scope.colName) {
          newRow[tailName] = tail;
        }
      }
      return newRow;
    })
  }));
}
