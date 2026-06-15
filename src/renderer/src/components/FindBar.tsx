import { useEffect, useRef, useState } from 'react'
import { FaXmark } from 'react-icons/fa6'

interface FindBarProps {
  onClose: () => void
}

export function FindBar({ onClose }: FindBarProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (query) {
      window.api.findInPage(query)
    } else {
      window.api.stopFindInPage()
    }
  }, [query])

  return (
    <div className="find-bar">
      <input
        ref={inputRef}
        className="find-bar-input"
        type="text"
        placeholder="Find in page…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button className="find-bar-close" onClick={onClose} title="Close (Esc)">
        <FaXmark />
      </button>
    </div>
  )
}
