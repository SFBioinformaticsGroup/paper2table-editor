import { useEffect, useRef, useState } from 'react'
import { FaEllipsisVertical, FaPencil, FaTrash } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'

interface Props {
  colName: string
  allDataColumns: string[]
  fileName: string
  tableIdx: number
  callbacks: EditorCallbacks
}

export function ColumnHeader({ colName, allDataColumns, fileName, tableIdx, callbacks }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const thRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (thRef.current && !thRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setMergeOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen])

  function startRename() {
    setRenameValue(colName)
    setRenaming(true)
    setMenuOpen(false)
  }

  function confirmRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== colName) {
      callbacks.renameColumn(fileName, tableIdx, colName, trimmed)
    }
    setRenaming(false)
  }

  function handleRenameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') confirmRename()
    if (e.key === 'Escape') setRenaming(false)
  }

  function handleDelete() {
    setMenuOpen(false)
    callbacks.deleteColumn(fileName, tableIdx, colName)
  }

  function handleMerge(target: string) {
    setMenuOpen(false)
    setMergeOpen(false)
    callbacks.mergeColumns(fileName, tableIdx, colName, target)
  }

  const otherCols = allDataColumns.filter((c) => c !== colName)

  return (
    <th className="col-header" ref={thRef}>
      {renaming ? (
        <input
          className="col-header-edit-input"
          value={renameValue}
          autoFocus
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKey}
          onBlur={confirmRename}
        />
      ) : (
        <span className="col-header-label">
          {colName}
          <span className="col-header-actions">
            <button
              className="col-header-icon-btn"
              title="Rename column"
              onClick={startRename}
            >
              <FaPencil />
            </button>
            <button
              className="col-header-icon-btn"
              title="More actions"
              onClick={() => { setMenuOpen((v) => !v); setMergeOpen(false) }}
            >
              <FaEllipsisVertical />
            </button>
          </span>
        </span>
      )}
      {menuOpen && (
        <div className="col-header-menu">
          <button onClick={handleDelete}>
            <FaTrash /> Delete column
          </button>
          {otherCols.length > 0 && (
            <button onClick={() => setMergeOpen((v) => !v)}>
              Merge with…
            </button>
          )}
          {mergeOpen && otherCols.length > 0 && (
            <div className="col-merge-list">
              {otherCols.map((c) => (
                <button key={c} className="col-merge-item" onClick={() => handleMerge(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </th>
  )
}
