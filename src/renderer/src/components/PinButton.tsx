import { FaThumbtack } from 'react-icons/fa6'

interface Props {
  pinned: boolean
  onToggle: () => void
}

export function PinButton({ pinned, onToggle }: Props) {
  return (
    <button
      className={`toc-pin-btn${pinned ? ' toc-pin-btn--active' : ''}`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
      title={pinned ? 'Unpin' : 'Pin'}
      aria-label={pinned ? 'Unpin paper' : 'Pin paper'}
    >
      <FaThumbtack />
    </button>
  )
}
