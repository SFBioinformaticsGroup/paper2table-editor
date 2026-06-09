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
  const [collapsedTables, setCollapsedTables] = useState(new Set<string>())

  function togglePaper(fileName: string) {
    setCollapsedPapers((prev) => {
      const next = new Set(prev)
      if (next.has(fileName)) next.delete(fileName)
      else next.add(fileName)
      return next
    })
  }

  function toggleTable(key: string) {
    setCollapsedTables((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
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
                  const isPaperCollapsed = collapsedPapers.has(fileName)

                  const tableItems = content
                    ? content.tables.map((table, tableIdx) => {
                        const fragments = getTableFragments(table)
                        const tableKey = `${fileName}-${tableIdx}`
                        const firstAnchor = fragments.length > 1
                          ? `${paperId}-table-${tableIdx + 1}`
                          : `${paperId}-table-${tableIdx + 1}-page-${fragments[0]?.page}`
                        const fragmentItems = fragments.map((fragment) => ({
                          page: fragment.page,
                          anchorId: `${paperId}-table-${tableIdx + 1}-page-${fragment.page}`
                        }))
                        return { tableIdx: tableIdx + 1, tableKey, firstAnchor, fragmentItems }
                      })
                    : []

                  return (
                    <li key={fileName}>
                      <div className="toc-row">
                        <button
                          className="toc-toggle"
                          onClick={() => togglePaper(fileName)}
                          disabled={!content}
                          aria-label={isPaperCollapsed ? 'Expand' : 'Collapse'}
                        >
                          {content ? (isPaperCollapsed ? '▸' : '▾') : '·'}
                        </button>
                        <a
                          href={`#${paperId}`}
                          className={activeId === paperId ? 'active' : undefined}
                          onClick={() => onSelectPaper(fileName)}
                        >
                          {dirtyFileNames.has(fileName) ? '• ' : ''}{fileName}
                        </a>
                      </div>

                      {!isPaperCollapsed && tableItems.length > 0 && (
                        <ul className="toc-tables">
                          {tableItems.map(({ tableIdx, tableKey, firstAnchor, fragmentItems }) => {
                            const isTableCollapsed = collapsedTables.has(tableKey)
                            const tableIsActive = activeId.startsWith(
                              `${paperId}-table-${tableIdx}-page`
                            )

                            return (
                              <li key={tableKey}>
                                <div className="toc-row">
                                  <button
                                    className="toc-toggle"
                                    onClick={() => toggleTable(tableKey)}
                                    aria-label={isTableCollapsed ? 'Expand' : 'Collapse'}
                                  >
                                    {fragmentItems.length > 1
                                      ? isTableCollapsed ? '▸' : '▾'
                                      : '·'}
                                  </button>
                                  <a
                                    href={`#${firstAnchor}`}
                                    className={tableIsActive ? 'active' : undefined}
                                  >
                                    Table {tableIdx}
                                  </a>
                                </div>

                                {!isTableCollapsed && fragmentItems.length > 1 && (
                                  <ul className="toc-fragments">
                                    {fragmentItems.map(({ page, anchorId }) => (
                                      <li key={anchorId}>
                                        <a
                                          href={`#${anchorId}`}
                                          className={activeId === anchorId ? 'active' : undefined}
                                        >
                                          Table {tableIdx}, p.&nbsp;{page}
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
