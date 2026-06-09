import { useState } from 'react'
import type { TablesFile } from '../types'
import { getTableFragments } from '../tableUtils'

interface Props {
  fileNames: string[]
  papers: Record<string, TablesFile>
  activeId: string
  hasMetadata: boolean
  hasSources: boolean
  dirtyFileNames: Set<string>
  onSelectPaper: (fileName: string) => void
}

export function Toc({ fileNames, papers, activeId, hasMetadata, hasSources, dirtyFileNames, onSelectPaper }: Props) {
  const [papersExpanded, setPapersExpanded] = useState(true)
  const [collapsedPapers, setCollapsedPapers] = useState(new Set<string>())

  function togglePaper(fileName: string) {
    setCollapsedPapers((prev) => {
      const next = new Set(prev)
      if (next.has(fileName)) next.delete(fileName)
      else next.add(fileName)
      return next
    })
  }

  return (
    <nav id="toc">
      <div id="toc-inner">
        <b>Contents</b>
        <ul>
          {hasMetadata && (
            <li>
              <a href="#metadata" className={activeId === 'metadata' ? 'active' : undefined}>
                Metadata
              </a>
            </li>
          )}
          {hasSources && (
            <li>
              <a href="#sources" className={activeId === 'sources' ? 'active' : undefined}>
                Sources
              </a>
            </li>
          )}
          <li>
            <div className="toc-row">
              <button className="toc-toggle" onClick={() => setPapersExpanded((v) => !v)}>
                {papersExpanded ? '▾' : '▸'}
              </button>
              <span className="toc-section-label">Papers</span>
            </div>
            {papersExpanded && (
              <ul>
                {fileNames.map((fileName, paperIdx) => {
                  const paperId = `paper-${paperIdx}`
                  const content = papers[fileName]
                  const isCollapsed = collapsedPapers.has(fileName)
                  const fragments = content
                    ? content.tables.flatMap((table, tableIdx) =>
                        getTableFragments(table).map((fragment) => ({
                          tableIdx: tableIdx + 1,
                          fragment,
                          id: `${paperId}-table-${tableIdx + 1}-page-${fragment.page}`
                        }))
                      )
                    : []

                  return (
                    <li key={fileName}>
                      <div className="toc-row">
                        <button
                          className="toc-toggle"
                          onClick={() => togglePaper(fileName)}
                          disabled={!content}
                          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {content ? (isCollapsed ? '▸' : '▾') : '·'}
                        </button>
                        <a
                          href={`#${paperId}`}
                          className={activeId === paperId ? 'active' : undefined}
                          onClick={() => onSelectPaper(fileName)}
                        >
                          {dirtyFileNames.has(fileName) ? '• ' : ''}{fileName}
                        </a>
                      </div>
                      {!isCollapsed && fragments.length > 0 && (
                        <ul>
                          {fragments.map(({ tableIdx, fragment, id }) => (
                            <li key={id}>
                              <a
                                href={`#${id}`}
                                className={activeId === id ? 'active' : undefined}
                              >
                                Table {tableIdx}, p.&nbsp;{fragment.page}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        </ul>
      </div>
    </nav>
  )
}
