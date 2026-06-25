import { FaBoxArchive } from 'react-icons/fa6'

interface Props {
  archived: boolean
  onToggle: () => void
}

export function ArchiveButton({ archived, onToggle }: Props) {
  return (
    <button
      className={`toc-archive-btn${archived ? ' toc-archive-btn--active' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
      title={archived ? 'Unarchive' : 'Archive'}
      aria-label={archived ? 'Unarchive paper' : 'Archive paper'}
    >
      <FaBoxArchive />
    </button>
  )
}
