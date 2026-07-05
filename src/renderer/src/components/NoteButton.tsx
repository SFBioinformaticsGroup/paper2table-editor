import { useState } from 'react'
import { FaNoteSticky } from 'react-icons/fa6'

interface Props {
  note: string
  onSave: (text: string) => void
}

export function NoteButton({ note, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  function handleOpen() {
    setDraft(note)
    setOpen(true)
  }

  function handleSave() {
    onSave(draft.trim())
    setOpen(false)
  }

  function handleCancel() {
    setOpen(false)
  }

  return (
    <>
      <button
        className={`toolbar-btn${note ? ' note-btn--active' : ''}`}
        title="Notes"
        onClick={handleOpen}
      >
        <FaNoteSticky /> Notes
      </button>
      {open && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Note</h3>
            <textarea
              className="modal-textarea"
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="toolbar-btn" onClick={handleCancel}>Cancel</button>
              {note && (
                <button className="toolbar-btn" onClick={() => { onSave(''); setOpen(false) }}>Clear</button>
              )}
              <button className="toolbar-btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
