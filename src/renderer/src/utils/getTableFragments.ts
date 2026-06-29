import { Table, TableFragment, TableWithFragments, Row } from "@renderer/types";

export function getTableFragments(table: Table): TableFragment[] {
  if ('table_fragments' in table) {
    return (table as TableWithFragments).table_fragments;
  }
  const t = table as { rows: Row[]; page: number; };
  return [{ rows: t.rows, page: t.page }];
}
