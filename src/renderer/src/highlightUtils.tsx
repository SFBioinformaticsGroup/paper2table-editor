import type { ReactNode } from 'react'

export function highlightText(text: string, query: string): ReactNode {
  if (!query || !text) return text
  const lower = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const parts: ReactNode[] = []
  let last = 0
  let idx = lower.indexOf(lowerQuery, last)
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx))
    parts.push(<mark key={idx} className="search-highlight">{text.slice(idx, idx + query.length)}</mark>)
    last = idx + query.length
    idx = lower.indexOf(lowerQuery, last)
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>
}
