import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaCopy, FaEllipsisVertical, FaEraser, FaPencil, FaPlus, FaRightLeft, FaScissors, FaTrash } from 'react-icons/fa6'
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
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [mergeMode, setMergeMode] = useState<'combine' | 'merge' | null>(null)
  const [addAfterOpen, setAddAfterOpen] = useState(false)
  const [addAfterName, setAddAfterName] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferName, setTransferName] = useState('')
  const thRef = useRef<HTMLTableCellElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (menuPos === null && !addAfterOpen && !transferOpen) return
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node
      const inTh = thRef.current?.contains(target) ?? false
      const inMenu = menuRef.current?.contains(target) ?? false
      if (!inTh && !inMenu) {
        setMenuPos(null)
        setMergeMode(null)
        setAddAfterOpen(false)
        setTransferOpen(false)
      }
    }
    function handleScroll() { setMenuPos(null) }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [menuPos, addAfterOpen, transferOpen])

  function startRename() {
    setRenameValue(colName)
    setRenaming(true)
    setMenuPos(null)
  }

  function confirmRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== colName) {
      callbacks.renameColumn(fileName, trimmed, options)
    }
    setRenaming(false)
  }

  function handleRenameKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') confirmRename()
    if (e.key === 'Escape') setRenaming(false)
  }

  function handleClearColumn() {
    setMenuPos(null)
    callbacks.clearColumn(fileName, options)
  }

  function handleDelete() {
    setMenuPos(null)
    callbacks.deleteColumn(fileName, options)
  }

  function handleDuplicate() {
    setMenuPos(null)
    callbacks.duplicateColumn(fileName, options)
  }

  function handleSplitColumn() {
    setMenuPos(null)
    callbacks.splitColumn(fileName, options)
  }

  function handleMerge(target: string) {
    const separator = mergeMode === 'combine' ? ' ' : ''
    setMenuPos(null)
    setMergeMode(null)
    callbacks.mergeColumns(fileName, target, separator, options)
  }

  function openAddAfter() {
    setAddAfterOpen(true)
    setMenuPos(null)
    setMergeMode(null)
    setAddAfterName('')
  }

  function confirmAddAfter() {
    const trimmed = addAfterName.trim()
    if (trimmed) callbacks.addColumn(fileName, trimmed, options)
    setAddAfterOpen(false)
    setAddAfterName('')
  }

  function cancelAddAfter() {
    setAddAfterOpen(false)
    setAddAfterName('')
  }

  function openTransfer() {
    setTransferOpen(true)
    setMenuPos(null)
    setMergeMode(null)
    setTransferName('')
  }

  function confirmTransfer() {
    const trimmed = transferName.trim()
    if (trimmed && trimmed !== colName) callbacks.transferColumnValues(fileName, trimmed, options)
    setTransferOpen(false)
    setTransferName('')
  }

  function cancelTransfer() {
    setTransferOpen(false)
    setTransferName('')
  }

  const options = { tableIdx, fragmentIdx, colName }
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
              onClick={() => {
                if (menuPos !== null) {
                  setMenuPos(null)
                } else if (thRef.current) {
                  const rect = thRef.current.getBoundingClientRect()
                  setMenuPos({ top: rect.bottom, left: rect.left })
                }
                setMergeMode(null)
                setAddAfterOpen(false)
                setTransferOpen(false)
              }}
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
      {menuPos !== null && createPortal(
        <div
          ref={menuRef}
          className="col-header-menu"
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
        >
          <button onClick={handleDuplicate}>
            <FaCopy /> Duplicate column
          </button>
          <button onClick={handleSplitColumn}>
            <FaScissors /> Split by last comma
          </button>
          <button onClick={openTransfer}>
            <FaRightLeft /> Transfer values to…
          </button>
          <button onClick={handleClearColumn}>
            <FaEraser /> Clear column
          </button>
          <button onClick={handleDelete}>
            <FaTrash /> Delete column
          </button>
          {otherCols.length > 0 && (
            <>
              <button onClick={() => setMergeMode((m) => m === 'combine' ? null : 'combine')}>
                Combine with…
              </button>
              <button onClick={() => setMergeMode((m) => m === 'merge' ? null : 'merge')}>
                Merge with…
              </button>
            </>
          )}
          {mergeMode !== null && otherCols.length > 0 && (
            <div className="col-merge-list">
              {otherCols.map((c) => (
                <button key={c} className="col-merge-item" onClick={() => handleMerge(c)}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </th>
  )
}
