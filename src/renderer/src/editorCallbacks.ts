export interface ColumnCallbackOpts {
  tableIdx: number
  fragmentIdx: number
  colName: string
}

export interface EditorCallbacks {
  deletePaper: (fileName: string) => void
  undo: (fileName: string) => void
  redo: (fileName: string) => void
  savePaper: (fileName: string) => void
  savePaperAs: (fileName: string) => void
  reloadPaper: (fileName: string) => void
  rerunTablemerge: (fileName: string) => void
  navigateToSource: (uuid: string, tableNumber?: number) => void

  reverseText: (fileName: string, tableIdx: number) => void
  transposeTable: (fileName: string, tableIdx: number) => void
  deaggregateTitleRows: (fileName: string, tableIdx: number) => void
  deleteTable: (fileName: string, tableIdx: number) => void
  deleteFragment: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  mergeAllTableRows: (fileName: string, tableIdx: number) => void
  mergeTableFragmentsWithNextTableFragments: (fileName: string, tableIdx: number) => void
  mergeTableFragmentsWithPreviousTableFragments: (fileName: string, tableIdx: number) => void
  mergeFragmentRowsWithNextFragmentRows: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  mergeFragmentRowsWithPreviousFragmentRows: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  mergeAllFragments: (fileName: string) => void

  deleteRow: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number) => void
  promoteRowToHeader: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number) => void
  breakFragment: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number, newPage: number) => void
  mergeRow: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number, direction: 'next' | 'prev') => void
  mergeLastRowWithNextFragment: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  moveLastRowToNextFragment: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  moveFirstRowToPrevFragment: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  applyPrevFragmentColumnNames: (fileName: string, tableIdx: number, fragmentIdx: number) => void
  addRow: (fileName: string, tableIdx: number, fragmentIdx: number, afterRowIdx?: number) => void
  duplicateRow: (fileName: string, tableIdx: number, fragmentIdx: number, rowIdx: number) => void

  clearColumn: (fileName: string, options: ColumnCallbackOpts) => void
  deleteColumn: (fileName: string, options: ColumnCallbackOpts) => void
  duplicateColumn: (fileName: string, options: ColumnCallbackOpts) => void
  splitColumn: (fileName: string, options: ColumnCallbackOpts) => void
  renameColumn: (fileName: string, newName: string, options: ColumnCallbackOpts) => void
  mergeColumns: (fileName: string, dropCol: string, separator: string, options: ColumnCallbackOpts) => void
  addColumn: (fileName: string, columnName: string, options: ColumnCallbackOpts) => void
  transferColumnValues: (fileName: string, destColName: string, options: ColumnCallbackOpts) => void

  editCell: (
    fileName: string,
    tableIdx: number,
    fragmentIdx: number,
    rowIdx: number,
    colName: string,
    newValue: string
  ) => void

  replicateCell: (
    fileName: string,
    tableIdx: number,
    fragmentIdx: number,
    rowIdx: number,
    colName: string
  ) => void
}
