export interface EditorCallbacks {
  deletePaper: (fileName: string) => void
  undo: (fileName: string) => void
  redo: (fileName: string) => void
  savePaper: (fileName: string) => void
  savePaperAs: (fileName: string) => void

  deleteTable: (fileName: string, tableIdx: number) => void
  deleteFragment: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  compactFragments: (fileName: string, tableIdx: number) => void
  mergeWithNextTable: (fileName: string, tableIdx: number) => void

  deleteRow: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number) => void
  promoteRowToHeader: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number) => void

  deleteColumn: (fileName: string, tableIdx: number, colName: string) => void
  renameColumn: (fileName: string, tableIdx: number, oldName: string, newName: string) => void
  mergeColumns: (fileName: string, tableIdx: number, keepCol: string, dropCol: string) => void

  editCell: (
    fileName: string,
    tableIdx: number,
    fragmentIdx: number,
    rowIdx: number,
    colName: string,
    newValue: string
  ) => void
}
