import { useEffect, useRef, useState } from 'react'
import { FaAnglesDown, FaPencil } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'
import { highlightText } from '../highlightUtils'

interface Props {
  displayValue: string
  fileName: string
  tableIdx: number
  fragmentIdx: number
  rowIdx: number
  colName: string
  isEditing: boolean
  className?: string
  rowSpan?: number
  searchQuery?: string
  canReplicate?: boolean
  isSelected?: boolean
  onStartEdit: () => void
  onConfirm: (newValue: string) => void  // confirms and stops editing (Enter/blur)
  onTabConfirm: (newValue: string) => void  // confirms and advances to next cell (Tab)
  onCancel: () => void  // cancels and stops editing (Escape)
  onReplicate?: () => void
  onCellMouseDown?: (e: React.MouseEvent<HTMLTableCellElement>) => void
  onCellMouseOver?: () => void
  callbacks: EditorCallbacks
}

export function EditableCell({
  displayValue,
  fileName,
  tableIdx,
  fragmentIdx,
  rowIdx,
  colName,
  isEditing,
  className,
  rowSpan,
  searchQuery,
  canReplicate,
  isSelected,
  onStartEdit,
  onConfirm,
  onTabConfirm,
  onCancel,
  onReplicate,
  onCellMouseDown,
  onCellMouseOver,
  callbacks
}: Props) {
  const [draft, setDraft] = useState(displayValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (isEditing) {
      setDraft(displayValue)
      committedRef.current = false
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isEditing, displayValue])

  function commit(value: string) {
    if (!committedRef.current) {
      committedRef.current = true
      if (value !== displayValue) {
        callbacks.editCell(fileName, tableIdx, fragmentIdx, rowIdx, colName, value)
      }
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      committedRef.current = true  // prevent blur from committing
      onCancel()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      commit(draft)
      onTabConfirm(draft)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit(draft)
      onConfirm(draft)
    }
    // Shift+Enter falls through — allows newline in textarea
  }

  function handleBlur() {
    commit(draft)
    onConfirm(draft)
  }

  if (isEditing) {
    return (
      <td className={['editable-cell editing', className].filter(Boolean).join(' ')} rowSpan={rowSpan}>
        <textarea
          ref={textareaRef}
          className="cell-edit-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
      </td>
    )
  }

  return (
    <td
      className={['editable-cell', isSelected && 'cell-selected', canReplicate && 'has-replicate', className].filter(Boolean).join(' ')}
      rowSpan={rowSpan}
      onDoubleClick={onStartEdit}
      onMouseDown={onCellMouseDown}
      onMouseOver={onCellMouseOver}
    >
      {searchQuery ? highlightText(displayValue, searchQuery) : displayValue}
      {canReplicate && (
        <button className="cell-replicate-btn" title="Replicate down" onClick={onReplicate}>
          <FaAnglesDown />
        </button>
      )}
      <button className="cell-edit-btn" title="Edit cell" onClick={onStartEdit}>
        <FaPencil />
      </button>
    </td>
  )
}
