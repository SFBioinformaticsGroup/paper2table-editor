import { useEffect, useRef, useState } from 'react'
import { FaPencil } from 'react-icons/fa6'
import type { EditorCallbacks } from '../editorCallbacks'

interface Props {
  displayValue: string
  fileName: string
  tableIdx: number
  fragmentIdx: number
  rowIdx: number
  colName: string
  isEditing: boolean
  onStartEdit: () => void
  onConfirm: (newValue: string) => void  // confirms and stops editing (Enter/blur)
  onTabConfirm: (newValue: string) => void  // confirms and advances to next cell (Tab)
  onCancel: () => void  // cancels and stops editing (Escape)
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
  onStartEdit,
  onConfirm,
  onTabConfirm,
  onCancel,
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
      <td className="editable-cell editing">
        <textarea
          ref={textareaRef}
          className="cell-edit-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          rows={Math.max(1, draft.split('\n').length)}
        />
      </td>
    )
  }

  return (
    <td className="editable-cell">
      {displayValue}
      <button className="cell-edit-btn" title="Edit cell" onClick={onStartEdit}>
        <FaPencil />
      </button>
    </td>
  )
}
