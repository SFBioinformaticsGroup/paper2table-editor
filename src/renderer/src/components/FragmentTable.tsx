import { useEffect, useRef, useState } from 'react'
import { FaAnglesDown, FaArrowDown, FaArrowsDownToLine, FaArrowsUpToLine, FaArrowUp, FaCircleArrowDown, FaCircleArrowUp, FaCopy, FaEllipsisVertical, FaPlus, FaScissors, FaTableColumns, FaTrash } from 'react-icons/fa6'
import { PageModal } from './PageModal'
import type { CellClipboard, CellSelection, ColumnValue, TableFragment } from '../types'
import { highlightText } from '../highlightUtils'

import type { EditorCallbacks } from '../editorCallbacks'
import { ColumnHeader } from './ColumnHeader'
import { EditableCell } from './EditableCell'
import { isEmptyRow, buildFragmentColumns, columnNames, computeRowspans, agreementClass, rowPaletteClass, renderDataCell, renderColumnValue } from '../utils/table'

const META_COLS = new Set(['row_', 'agreement_level_', 'readers_', 'sources_'])

interface Props {
  tableIdx: number         // 1-based display index
  tableIdxZero: number     // 0-based index into file.tables
  fragmentIdx: number      // 0-based fragment index
  fragment: TableFragment
  uuidToReader: Map<string, string>
  uuidToFullPath: Map<string, string | null>
  anchorId: string | undefined  // undefined for single-fragment tables (anchor is on h4 in parent)
  showFragmentHeading: boolean  // true when parent table has multiple fragments
  fileName: string
  callbacks: EditorCallbacks
  searchQuery?: string
  showEmptyRows: boolean
  hasNextFragment: boolean
  canApplyPrevColumnNames: boolean
  cellSelection: CellSelection | null
  cellClipboard: CellClipboard | null
  onCellMouseDown: (fileName: string, tableIdx: number, fragmentIdx: number, rowOriginalIdx: number, editableColIdx: number, isShift: boolean) => void
  onCellMouseOver: (fileName: string, tableIdx: number, fragmentIdx: number, rowOriginalIdx: number, editableColIdx: number) => void
}

interface RowActionsMenuProps {
  fileName: string
  tableIdxZero: number
  fragmentIdx: number
  originalIdx: number
  displayIdx: number
  displayedRowsLength: number
  hasNextFragment: boolean
  callbacks: EditorCallbacks
  onBreakClick: () => void
}

function RowActionsMenu({
  fileName,
  tableIdxZero,
  fragmentIdx,
  originalIdx,
  displayIdx,
  displayedRowsLength,
  hasNextFragment,
  callbacks,
  onBreakClick
}: RowActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const tdRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (tdRef.current && !tdRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen])

  return (
    <td className="row-actions" ref={tdRef}>
      <button
        title="Delete row"
        onClick={() => callbacks.deleteRow(fileName, tableIdxZero, fragmentIdx, originalIdx)}
      >
        <FaTrash />
      </button>
      {displayIdx > 0 && (
        <button
          title="Merge with previous row"
          onClick={() => callbacks.mergeRow(fileName, tableIdxZero, fragmentIdx, originalIdx, 'prev')}
        >
          <FaArrowsUpToLine />
        </button>
      )}
      {displayIdx < displayedRowsLength - 1 && (
        <button
          title="Merge with next row"
          onClick={() => callbacks.mergeRow(fileName, tableIdxZero, fragmentIdx, originalIdx, 'next')}
        >
          <FaArrowsDownToLine />
        </button>
      )}
      {displayIdx === 0 && fragmentIdx > 0 && (
        <button
          title="Move to previous fragment"
          onClick={() => callbacks.moveFirstRowToPrevFragment(fileName, tableIdxZero, fragmentIdx)}
        >
          <FaCircleArrowUp />
        </button>
      )}
      {displayIdx === displayedRowsLength - 1 && hasNextFragment && (
        <button
          title="Merge with first row of next fragment"
          onClick={() => callbacks.mergeLastRowWithNextFragment(fileName, tableIdxZero, fragmentIdx)}
        >
          <FaAnglesDown />
        </button>
      )}
      {displayIdx === displayedRowsLength - 1 && hasNextFragment && (
        <button
          title="Move to next fragment"
          onClick={() => callbacks.moveLastRowToNextFragment(fileName, tableIdxZero, fragmentIdx)}
        >
          <FaCircleArrowDown />
        </button>
      )}
      <button
        title="Add row after"
        onClick={() => callbacks.addRow(fileName, tableIdxZero, fragmentIdx, originalIdx)}
      >
        <FaPlus />
      </button>
      <button
        title="More actions"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <FaEllipsisVertical />
      </button>
      {menuOpen && (
        <div className="row-actions-menu">
          <button onClick={() => { callbacks.promoteRowToHeader(fileName, tableIdxZero, fragmentIdx, originalIdx); setMenuOpen(false) }}>
            <FaArrowUp /> Promote to header
          </button>
          {originalIdx > 0 && (
            <button onClick={() => { onBreakClick(); setMenuOpen(false) }}>
              <FaScissors /> Break fragment here
            </button>
          )}
          <button onClick={() => { callbacks.duplicateRow(fileName, tableIdxZero, fragmentIdx, originalIdx); setMenuOpen(false) }}>
            <FaCopy /> Duplicate row
          </button>
        </div>
      )}
    </td>
  )
}

export function FragmentTable({
  tableIdx,
  tableIdxZero,
  fragmentIdx,
  fragment,
  uuidToReader,
  uuidToFullPath,
  anchorId,
  showFragmentHeading,
  fileName,
  callbacks,
  searchQuery,
  showEmptyRows,
  hasNextFragment,
  canApplyPrevColumnNames,
  cellSelection,
  cellClipboard: _cellClipboard,
  onCellMouseDown,
  onCellMouseOver
}: Props) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null)
  const [pendingBreakRowIdx, setPendingBreakRowIdx] = useState<number | null>(null)

  const allRows = fragment.rows

  // Track original fragment indices alongside displayed rows so callbacks get the right index.
  const displayedRows: { row: typeof allRows[0]; originalIdx: number }[] = allRows.flatMap(
    (row, originalIdx) =>
      !showEmptyRows && isEmptyRow(row) ? [] : [{ row, originalIdx }]
  )

  const columns = displayedRows.length > 0
    ? buildFragmentColumns(displayedRows.map((r) => r.row))
    : []
  const allDataCols = columnNames(displayedRows.map((r) => r.row))
  const rowspanMatrix = displayedRows.length > 0
    ? computeRowspans(displayedRows.map((r) => r.row), columns, uuidToReader)
    : []

  const editableCols = allDataCols.filter((c) => !META_COLS.has(c))

  const isOwnSelection =
    cellSelection !== null &&
    cellSelection.fileName === fileName &&
    cellSelection.tableIdx === tableIdxZero &&
    cellSelection.fragmentIdx === fragmentIdx

  const selStartRowOrig = isOwnSelection ? Math.min(cellSelection!.anchorRowOriginalIdx, cellSelection!.currentRowOriginalIdx) : -1
  const selEndRowOrig   = isOwnSelection ? Math.max(cellSelection!.anchorRowOriginalIdx, cellSelection!.currentRowOriginalIdx) : -1
  const selStartCol     = isOwnSelection ? Math.min(cellSelection!.anchorColIdx, cellSelection!.currentColIdx) : -1
  const selEndCol       = isOwnSelection ? Math.max(cellSelection!.anchorColIdx, cellSelection!.currentColIdx) : -1

  function advanceEdit(rowIdx: number, colIdx: number) {
    const dataCols = columns.filter((c) => !META_COLS.has(c))
    const nextColIdx = colIdx + 1
    if (nextColIdx < dataCols.length) {
      setEditingCell({ rowIdx, colIdx: nextColIdx })
    } else if (rowIdx + 1 < displayedRows.length) {
      setEditingCell({ rowIdx: rowIdx + 1, colIdx: 0 })
    } else {
      setEditingCell(null)
    }
  }

  return (
    <div className="fragment-section">
      {showFragmentHeading && (
        <>
          <h4 id={anchorId}>Table {tableIdx}, p. {fragment.page}</h4>
          <div className="fragment-toolbar">
            {canApplyPrevColumnNames && (
              <button
                className="table-toolbar-btn"
                title="Apply column names from previous fragment"
                onClick={() => callbacks.applyPrevFragmentColumnNames(fileName, tableIdxZero, fragmentIdx)}
              >
                <FaTableColumns /> Apply column names
              </button>
            )}
            {fragmentIdx > 0 && (
              <button
                className="table-toolbar-btn"
                title="Merge all rows of this fragment with the previous fragment's rows"
                onClick={() => callbacks.mergeFragmentRowsWithPreviousFragmentRows(fileName, tableIdxZero, fragmentIdx)}
              >
                <FaArrowUp /> Merge with previous Fragment
              </button>
            )}
            {hasNextFragment && (
              <button
                className="table-toolbar-btn"
                title="Merge all rows of this fragment with the next fragment's rows"
                onClick={() => callbacks.mergeFragmentRowsWithNextFragmentRows(fileName, tableIdxZero, fragmentIdx)}
              >
                <FaArrowDown /> Merge with next Fragment
              </button>
            )}
            <button
              className="table-toolbar-btn danger"
              title="Delete this fragment"
              onClick={() => callbacks.deleteFragment(fileName, tableIdxZero, fragmentIdx)}
            >
              <FaTrash /> Delete fragment
            </button>
          </div>
        </>
      )}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th className="row-actions-header">
                <button
                  className="add-first-row-btn"
                  title="Add row at top"
                  onClick={() => callbacks.addRow(fileName, tableIdxZero, fragmentIdx, -1)}
                >
                  <FaPlus />
                </button>
              </th>
              {columns.map((col) =>
                META_COLS.has(col) ? (
                  <th key={col}>{col}</th>
                ) : (
                  <ColumnHeader
                    key={col}
                    colName={col}
                    allDataColumns={allDataCols}
                    fileName={fileName}
                    tableIdx={tableIdxZero}
                    fragmentIdx={fragmentIdx}
                    callbacks={callbacks}
                    searchQuery={searchQuery}
                  />
                )
              )}
            </tr>
          </thead>
          <tbody>
            {displayedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="no-rows-cell">
                  <i>No rows</i>
                </td>
              </tr>
            ) : (
              displayedRows.map(({ row, originalIdx }, displayIdx) => {
                const dataCols = columns.filter((c) => !META_COLS.has(c))
                const cellRowspans = rowspanMatrix[displayIdx] ?? {}
                return (
                  <tr key={originalIdx}>
                    <RowActionsMenu
                      fileName={fileName}
                      tableIdxZero={tableIdxZero}
                      fragmentIdx={fragmentIdx}
                      originalIdx={originalIdx}
                      displayIdx={displayIdx}
                      displayedRowsLength={displayedRows.length}
                      hasNextFragment={hasNextFragment}
                      callbacks={callbacks}
                      onBreakClick={() => setPendingBreakRowIdx(originalIdx)}
                    />
                    {columns.map((col) => {
                      const span = cellRowspans[col] ?? 1
                      if (span === 0) return null
                      const rowSpanProp = span > 1 ? span : undefined
                      if (col === 'sources_') {
                        const uuids = row.sources_ ?? []
                        return (
                          <td key={col} className="sources-cell" rowSpan={rowSpanProp}>
                            {uuids.map((uuid) => {
                              const fullPath = uuidToFullPath.get(uuid)
                              const navigable = fullPath != null
                              return navigable ? (
                                <a
                                  key={uuid}
                                  className="uuid-chip"
                                  title={fullPath}
                                  href="#"
                                  onClick={(e) => { e.preventDefault(); callbacks.navigateToSource(uuid, tableIdxZero + 1) }}
                                >
                                  {uuid.slice(0, 8)}
                                </a>
                              ) : (
                                <span key={uuid} className="uuid-chip uuid-chip-dead" title={uuid}>
                                  {uuid.slice(0, 8)}
                                </span>
                              )
                            })}
                          </td>
                        )
                      }
                      if (META_COLS.has(col)) {
                        let tdClass: string | undefined
                        if (col === 'agreement_level_') tdClass = agreementClass(row.agreement_level_)
                        else if (col === 'row_') tdClass = rowPaletteClass(row)
                        return <td key={col} className={tdClass} rowSpan={rowSpanProp}>{highlightText(renderDataCell(row, col, uuidToReader), searchQuery ?? '')}</td>
                      }
                      const colIdx = dataCols.indexOf(col)
                      const isEditing =
                        editingCell?.rowIdx === displayIdx && editingCell?.colIdx === colIdx
                      const cellValue = renderColumnValue(row[col] as ColumnValue)
                      const nextOriginalIdx = originalIdx + 1
                      const cellCanReplicate =
                        cellValue !== '' &&
                        nextOriginalIdx < allRows.length &&
                        renderColumnValue(allRows[nextOriginalIdx][col] as ColumnValue) === ''
                      const editableColIdx = editableCols.indexOf(col)
                      const isSelected =
                        isOwnSelection &&
                        originalIdx >= selStartRowOrig && originalIdx <= selEndRowOrig &&
                        editableColIdx >= selStartCol && editableColIdx <= selEndCol
                      return (
                        <EditableCell
                          key={col}
                          displayValue={renderDataCell(row, col, uuidToReader)}
                          fileName={fileName}
                          tableIdx={tableIdxZero}
                          fragmentIdx={fragmentIdx}
                          rowIdx={originalIdx}
                          colName={col}
                          isEditing={isEditing}
                          rowSpan={rowSpanProp}
                          searchQuery={searchQuery}
                          canReplicate={cellCanReplicate}
                          isSelected={isSelected}
                          onStartEdit={() => setEditingCell({ rowIdx: displayIdx, colIdx })}
                          onConfirm={() => setEditingCell(null)}
                          onTabConfirm={() => advanceEdit(displayIdx, colIdx)}
                          onCancel={() => setEditingCell(null)}
                          onReplicate={() => callbacks.replicateCell(fileName, tableIdxZero, fragmentIdx, originalIdx, col)}
                          onCellMouseDown={(e) => {
                            e.preventDefault()
                            onCellMouseDown(fileName, tableIdxZero, fragmentIdx, originalIdx, editableColIdx, e.shiftKey)
                          }}
                          onCellMouseOver={() => {
                            onCellMouseOver(fileName, tableIdxZero, fragmentIdx, originalIdx, editableColIdx)
                          }}
                          callbacks={callbacks}
                        />
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      {pendingBreakRowIdx !== null && (
        <PageModal
          minPage={fragment.page}
          onConfirm={(newPage) => {
            callbacks.breakFragment(fileName, tableIdxZero, fragmentIdx, pendingBreakRowIdx, newPage)
            setPendingBreakRowIdx(null)
          }}
          onCancel={() => setPendingBreakRowIdx(null)}
        />
      )}
    </div>
  )
}
