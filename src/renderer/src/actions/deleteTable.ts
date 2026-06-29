import type { TablesFile } from '../types';


export function deleteTable(file: TablesFile, tableIdx: number): TablesFile {
  return { ...file, tables: file.tables.filter((_, i) => i !== tableIdx) };
}
