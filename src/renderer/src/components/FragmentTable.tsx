import type { TableFragment } from '../types'
import { agreementClass, buildFragmentColumns, isEmptyRow, renderDataCell } from '../tableUtils'

interface Props {
  tableIdx: number
  fragment: TableFragment
  uuidToReader: Map<string, string>
  anchorId: string
}

export function FragmentTable({ tableIdx, fragment, uuidToReader, anchorId }: Props) {
  const allRows = fragment.rows
  const rows = allRows.filter((r) => !isEmptyRow(r))
  const skipped = allRows.length - rows.length

  const columns = rows.length > 0 ? buildFragmentColumns(rows) : []

  return (
    <div>
      <h4 id={anchorId}>Table {tableIdx}, page {fragment.page}</h4>
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
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={agreementClass(row.agreement_level_)}>
                    {columns.map((col) => (
                      <td key={col}>{renderDataCell(row, col, uuidToReader)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {skipped > 0 && <p><i>({skipped} empty rows not shown)</i></p>}
        </>
      )}
    </div>
  )
}
