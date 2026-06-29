import { FaChevronLeft, FaChevronRight, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6'

interface Props {
  dirPath: string
  canBack: boolean
  canForward: boolean
  canUndo: boolean
  focusedDirty: boolean
  onBack: () => void
  onForward: () => void
  onUndo: () => void
  onSave: () => void
  onSaveAs: () => void
}

export function DirHeader({ dirPath, canBack, canForward, canUndo, focusedDirty, onBack, onForward, onUndo, onSave, onSaveAs }: Props) {
  return (
    <div className="dir-header">
      <div className="nav-buttons">
        <button
          className="nav-btn"
          title="Back (Cmd+[)"
          disabled={!canBack}
          onClick={onBack}
        >
          <FaChevronLeft />
        </button>
        <button
          className="nav-btn"
          title="Forward (Cmd+])"
          disabled={!canForward}
          onClick={onForward}
        >
          <FaChevronRight />
        </button>
      </div>
      <span className="dir-path">{dirPath}</span>
      <div className="header-actions">
        <button
          className="toolbar-btn"
          title="Undo (Cmd+Z)"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <FaRotateLeft />
        </button>
        <button
          className={`toolbar-btn save-btn${focusedDirty ? ' dirty' : ''}`}
          title="Save (Cmd+S)"
          disabled={!focusedDirty}
          onClick={onSave}
        >
          <FaFloppyDisk /> {focusedDirty ? 'Save*' : 'Save'}
        </button>
        <button
          className="toolbar-btn"
          title="Save As…"
          onClick={onSaveAs}
        >
          <FaFloppyDisk /> Save As…
        </button>
      </div>
    </div>
  )
}
