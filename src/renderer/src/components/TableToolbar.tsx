import { FaArrowDown, FaArrowRightArrowLeft, FaArrowUp, FaLayerGroup, FaObjectUngroup, FaTableColumns, FaTrash } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'

interface Props {
  fileName: string
  tableIdx: number
  hasFragments: boolean
  isFirstTable: boolean
  isLastTable: boolean
  callbacks: EditorCallbacks
}

export function TableToolbar({ fileName, tableIdx, hasFragments, isFirstTable, isLastTable, callbacks }: Props) {
  return (
    <div className="table-toolbar">
      {hasFragments && (
        <button
          className="table-toolbar-btn"
          title="Flatten all fragments into a single table"
          onClick={() => callbacks.mergeAllTableRows(fileName, tableIdx)}
        >
          <FaLayerGroup /> Merge All Fragments
        </button>
      )}
      <button
        className="table-toolbar-btn"
        title="Reverse all cell text in this table"
        onClick={() => callbacks.reverseText(fileName, tableIdx)}
      >
        <FaArrowRightArrowLeft /> Reverse text
      </button>
      <button
        className="table-toolbar-btn"
        title="Transpose: convert rows into columns and columns into rows"
        onClick={() => callbacks.transposeTable(fileName, tableIdx)}
      >
        <FaTableColumns /> Transpose
      </button>
      <button
        className="table-toolbar-btn"
        title="Deaggregate titles: expand grouped rows into flat rows with the title filled in"
        onClick={() => callbacks.deaggregateTitleRows(fileName, tableIdx)}
      >
        <FaObjectUngroup /> Deaggregate titles
      </button>
      {!isFirstTable && (
        <button
          className="table-toolbar-btn"
          title="Merge this table's fragments with the previous table's fragments"
          onClick={() => callbacks.mergeTableFragmentsWithPreviousTableFragments(fileName, tableIdx)}
        >
          <FaArrowUp /> Merge with previous Table
        </button>
      )}
      {!isLastTable && (
        <button
          className="table-toolbar-btn"
          title="Merge this table's fragments with the next table's fragments"
          onClick={() => callbacks.mergeTableFragmentsWithNextTableFragments(fileName, tableIdx)}
        >
          <FaArrowDown /> Merge with next Table
        </button>
      )}
      <button
        className="table-toolbar-btn danger"
        title="Delete this table"
        onClick={() => callbacks.deleteTable(fileName, tableIdx)}
      >
        <FaTrash /> Delete table
      </button>
    </div>
  )
}
