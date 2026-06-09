import { useState } from 'react'
import { FaArrowUp, FaTrash } from 'react-icons/fa6'
import type { TableFragment } from '../types'
import { agreementClass, buildFragmentColumns, columnNames, isEmptyRow, renderDataCell } from '../tableUtils'
import type { EditorCallbacks } from '../editorCallbacks'
import { ColumnHeader } from './ColumnHeader'
import { EditableCell } from './EditableCell'

const META_COLS = new Set(['agreement_level_', 'readers_', 'sources_'])

interface Props {
  tableIdx: number         // 1-based display index
  tableIdxZero: number     // 0-based index into file.tables
  fragmentIdx: number      // 0-based fragment index
  fragment: TableFragment
  uuidToReader: Map<string, string>
  anchorId: string | undefined  // undefined for single-fragment tables (anchor is on h4 in parent)
  showFragmentHeading: boolean  // true when parent table has multiple fragments
  fileName: string
  callbacks: EditorCallbacks
}

export function FragmentTable({
  tableIdx,
  tableIdxZero,
  fragmentIdx,
  fragment,
  uuidToReader,
  anchorId,
  showFragmentHeading,
  fileName,
  callbacks
}: Props) {
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; colIdx: number } | null>(null)

  const allRows = fragment.rows
  const rows = allRows.filter((r) => !isEmptyRow(r))
  const skipped = allRows.length - rows.length

  const columns = rows.length > 0 ? buildFragmentColumns(rows) : []
  const allDataCols = columnNames(rows)

  function advanceEdit(rowIdx: number, colIdx: number) {
    const dataCols = columns.filter((c) => !META_COLS.has(c))
    const nextColIdx = colIdx + 1
    if (nextColIdx < dataCols.length) {
      setEditingCell({ rowIdx, colIdx: nextColIdx })
    } else if (rowIdx + 1 < rows.length) {
      setEditingCell({ rowIdx: rowIdx + 1, colIdx: 0 })
    } else {
      setEditingCell(null)
    }
  }

  return (
    <div className="fragment-section">
      {showFragmentHeading && (
        <>
          <h5 id={anchorId}>Table {tableIdx}, p. {fragment.page}</h5>
          <div className="fragment-toolbar">
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

      {rows.length === 0 ? (
        <>
          <p><i>No rows</i></p>
          {skipped > 0 && <p><i>({skipped} empty rows not shown)</i></p>}
        </>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="row-actions-header" />
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
                        callbacks={callbacks}
                      />
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => {
                  const dataCols = columns.filter((c) => !META_COLS.has(c))
                  return (
                    <tr key={rowIdx} className={agreementClass(row.agreement_level_)}>
                      <td className="row-actions">
                        <button
                          title="Delete row"
                          onClick={() =>
                            callbacks.deleteRow(fileName, tableIdxZero, fragmentIdx, rowIdx)
                          }
                        >
                          <FaTrash />
                        </button>
                        <button
                          title="Promote row to header"
                          onClick={() =>
                            callbacks.promoteRowToHeader(
                              fileName,
                              tableIdxZero,
                              fragmentIdx,
                              rowIdx
                            )
                          }
                        >
                          <FaArrowUp />
                        </button>
                      </td>
                      {columns.map((col) => {
                        if (META_COLS.has(col)) {
                          return <td key={col}>{renderDataCell(row, col, uuidToReader)}</td>
                        }
                        const colIdx = dataCols.indexOf(col)
                        const isEditing =
                          editingCell?.rowIdx === rowIdx && editingCell?.colIdx === colIdx
                        return (
                          <EditableCell
                            key={col}
                            displayValue={renderDataCell(row, col, uuidToReader)}
                            fileName={fileName}
                            tableIdx={tableIdxZero}
                            fragmentIdx={fragmentIdx}
                            rowIdx={rowIdx}
                            colName={col}
                            isEditing={isEditing}
                            onStartEdit={() => setEditingCell({ rowIdx, colIdx })}
                            onConfirm={() => setEditingCell(null)}
                            onTabConfirm={() => advanceEdit(rowIdx, colIdx)}
                            onCancel={() => setEditingCell(null)}
                            callbacks={callbacks}
                          />
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {skipped > 0 && <p><i>({skipped} empty rows not shown)</i></p>}
        </>
      )}
    </div>
  )
}
