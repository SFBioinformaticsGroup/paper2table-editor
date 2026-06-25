import { useState } from 'react'

interface Props {
  onConfirm: (description: string) => void
  onCancel: () => void
}

export function CurationModal({ onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState('')

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Save Note</h3>
        <textarea
          className="modal-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onConfirm(draft)
            }
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          placeholder="Description (optional)"
          rows={3}
        />
        <div className="modal-actions">
          <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button className="toolbar-btn" onClick={() => onConfirm(draft)}>OK</button>
        </div>
      </div>
    </div>
  )
}
