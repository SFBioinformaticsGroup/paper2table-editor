import { useState } from 'react'

interface Props {
  initialDraft?: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function NameModal({ initialDraft = '', onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState(initialDraft)

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>Your Name</h3>
        <input
          type="text"
          className="modal-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirm(draft)
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
          placeholder="Full name"
        />
        <div className="modal-actions">
          <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button
            className="toolbar-btn"
            onClick={() => onConfirm(draft)}
            disabled={!draft.trim()}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
