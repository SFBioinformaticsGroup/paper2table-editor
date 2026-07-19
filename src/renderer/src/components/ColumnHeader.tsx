import { useEffect, useRef, useState } from 'react'
import { FaCopy, FaEllipsisVertical, FaPencil, FaPlus, FaRightLeft, FaTrash } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'
import { highlightText } from '../highlightUtils'

interface Props {
  colName: string
  allDataColumns: string[]
  fileName: string
  tableIdx: number
  fragmentIdx: number
  callbacks: EditorCallbacks
  searchQuery?: string
}

export function ColumnHeader({ colName, allDataColumns, fileName, tableIdx, fragmentIdx, callbacks, searchQuery }: Props) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [addAfterOpen, setAddAfterOpen] = useState(false)
  const [addAfterName, setAddAfterName] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferName, setTransferName] = useState('')
  const thRef = useRef<HTMLTableCellElement>(null)

  useEffect(() => {
    if (!menuOpen && !addAfterOpen && !transferOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (thRef.current && !thRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setMergeOpen(false)
        setAddAfterOpen(false)
        setTransferOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen, addAfterOpen, transferOpen])

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

  function handleDuplicate() {
    setMenuOpen(false)
    callbacks.duplicateColumn(fileName, tableIdx, colName)
  }

  function handleMerge(target: string) {
    setMenuOpen(false)
    setMergeOpen(false)
    callbacks.mergeColumns(fileName, tableIdx, colName, target)
  }

  function openAddAfter() {
    setAddAfterOpen(true)
    setMenuOpen(false)
    setMergeOpen(false)
    setAddAfterName('')
  }

  function confirmAddAfter() {
    const trimmed = addAfterName.trim()
    if (trimmed) callbacks.addColumn(fileName, tableIdx, trimmed, colName)
    setAddAfterOpen(false)
    setAddAfterName('')
  }

  function cancelAddAfter() {
    setAddAfterOpen(false)
    setAddAfterName('')
  }

  function openTransfer() {
    setTransferOpen(true)
    setMenuOpen(false)
    setMergeOpen(false)
    setTransferName('')
  }

  function confirmTransfer() {
    const trimmed = transferName.trim()
    if (trimmed && trimmed !== colName) callbacks.transferColumnValues(fileName, tableIdx, fragmentIdx, colName, trimmed)
    setTransferOpen(false)
    setTransferName('')
  }

  function cancelTransfer() {
    setTransferOpen(false)
    setTransferName('')
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
          {highlightText(colName, searchQuery ?? '')}
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
              title="Add column after"
              onClick={openAddAfter}
            >
              <FaPlus />
            </button>
            <button
              className="col-header-icon-btn"
              title="More actions"
              onClick={() => { setMenuOpen((v) => !v); setMergeOpen(false); setAddAfterOpen(false); setTransferOpen(false) }}
            >
              <FaEllipsisVertical />
            </button>
          </span>
        </span>
      )}
      {addAfterOpen && (
        <div className="col-header-add-after">
          <input
            className="add-col-input"
            autoFocus
            placeholder="New column name"
            value={addAfterName}
            onChange={(e) => setAddAfterName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmAddAfter()
              if (e.key === 'Escape') cancelAddAfter()
            }}
            onBlur={confirmAddAfter}
          />
        </div>
      )}
      {transferOpen && (
        <div className="col-header-add-after">
          <input
            className="add-col-input"
            autoFocus
            placeholder="Destination column"
            value={transferName}
            onChange={(e) => setTransferName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmTransfer()
              if (e.key === 'Escape') cancelTransfer()
            }}
            onBlur={confirmTransfer}
          />
        </div>
      )}
      {menuOpen && (
        <div className="col-header-menu">
          <button onClick={handleDuplicate}>
            <FaCopy /> Duplicate column
          </button>
          <button onClick={openTransfer}>
            <FaRightLeft /> Transfer values to…
          </button>
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
