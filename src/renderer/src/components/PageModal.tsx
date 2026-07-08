import { useState } from 'react'

interface Props {
  minPage: number
  onConfirm: (page: number) => void
  onCancel: () => void
}

export function PageModal({ minPage, onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState(String(minPage))
  const parsed = parseInt(draft, 10)
  const isValid = !isNaN(parsed) && parsed >= minPage

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <h3>New Fragment Page</h3>
        <p>Page number for the new fragment (min: {minPage})</p>
        <input
          type="number"
          className="modal-input"
          value={draft}
          min={minPage}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isValid) onConfirm(parsed)
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
        />
        <div className="modal-actions">
          <button className="toolbar-btn" onClick={onCancel}>Cancel</button>
          <button
            className="toolbar-btn"
            onClick={() => { if (isValid) onConfirm(parsed) }}
            disabled={!isValid}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
