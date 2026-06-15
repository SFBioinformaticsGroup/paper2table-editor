import type { RefObject } from 'react'
import { FaMagnifyingGlass } from 'react-icons/fa6'

export interface SearchState {
  query: string
  includeNavTitles: boolean
  includeAllSections: boolean
}

interface Props {
  searchState: SearchState
  onChange: (next: SearchState) => void
  inputRef: RefObject<HTMLInputElement>
}

export function SearchBar({ searchState, onChange, inputRef }: Props) {
  const { query, includeNavTitles, includeAllSections } = searchState
  return (
    <div className="search-bar">
      <FaMagnifyingGlass className="search-bar-icon" />
      <input
        ref={inputRef}
        type="text"
        className="search-bar-input"
        placeholder="Search…"
        value={query}
        onChange={(e) => onChange({ ...searchState, query: e.target.value })}
      />
      <label className="search-bar-label">
        <input
          type="checkbox"
          checked={includeNavTitles}
          onChange={(e) => onChange({ ...searchState, includeNavTitles: e.target.checked })}
        />
        Include titles
      </label>
      <label className="search-bar-label">
        <input
          type="checkbox"
          checked={includeAllSections}
          onChange={(e) => onChange({ ...searchState, includeAllSections: e.target.checked })}
        />
        Include all open sections
      </label>
    </div>
  )
}
