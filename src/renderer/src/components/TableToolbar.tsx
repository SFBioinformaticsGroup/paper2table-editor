import { FaArrowDown, FaLayerGroup, FaTrash } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'

interface Props {
  fileName: string
  tableIdx: number
  hasFragments: boolean
  isLastTable: boolean
  callbacks: EditorCallbacks
}

export function TableToolbar({ fileName, tableIdx, hasFragments, isLastTable, callbacks }: Props) {
  return (
    <div className="table-toolbar">
      <button
        className="table-toolbar-btn danger"
        title="Delete this table"
        onClick={() => callbacks.deleteTable(fileName, tableIdx)}
      >
        <FaTrash /> Delete table
      </button>
      {hasFragments && (
        <button
          className="table-toolbar-btn"
          title="Compact all fragments into a single table"
          onClick={() => callbacks.compactFragments(fileName, tableIdx)}
        >
          <FaLayerGroup /> Compact fragments
        </button>
      )}
      {!isLastTable && (
        <button
          className="table-toolbar-btn"
          title="Merge this table with the next one"
          onClick={() => callbacks.mergeWithNextTable(fileName, tableIdx)}
        >
          <FaArrowDown /> Merge with next
        </button>
      )}
    </div>
  )
}
