import { TablesFile, TableFragment } from "@renderer/types";
import { getTableFragments } from './getTableFragments';



export function mapTableFragments(
  file: TablesFile,
  tableIdx: number,
  fn: (fragment: TableFragment, fragmentIdx: number) => TableFragment
): TablesFile {
  const tables = file.tables.map((table, ti) => {
    if (ti !== tableIdx) return table;
    const fragments = getTableFragments(table).map(fn);
    if ('table_fragments' in table) return { table_fragments: fragments };
    // was TableWithRows — if single fragment keep that shape, else upgrade
    if (fragments.length === 1) return { rows: fragments[0].rows, page: fragments[0].page };
    return { table_fragments: fragments };
  });
  return { ...file, tables };
}
