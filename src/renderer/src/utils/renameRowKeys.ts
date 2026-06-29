import { Row, ColumnValue } from "@renderer/types";


export function renameRowKeys(row: Row, renameMap: Map<string, string>): Row {
  const next: Row = {};
  if (row.agreement_level_ !== undefined) next.agreement_level_ = row.agreement_level_;
  if (row.sources_ !== undefined) next.sources_ = row.sources_;
  for (const [key, val] of Object.entries(row)) {
    if (key === 'agreement_level_' || key === 'sources_') continue;
    const newKey = renameMap.get(key) ?? key;
    next[newKey] = val as ColumnValue;
  }
  return next;
}
