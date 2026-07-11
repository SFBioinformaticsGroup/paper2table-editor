import { useState } from 'react'
import { FaAnglesLeft, FaAnglesRight } from 'react-icons/fa6'
import type { TablesFile } from '../types'
import { getTableFragments } from '../utils/getTableFragments'
import { highlightText } from '../highlightUtils'
import { PinButton } from './PinButton'
import { ArchiveButton } from './ArchiveButton'

interface Props {
  fileNames: string[]
  papers: Record<string, TablesFile>
  activeId: string
  hasMetadata: boolean
  hasSources: boolean
  hasSettings: boolean
  dirtyFileNames: Set<string>
  collapsed: boolean
  activeSectionKey: string
  searchQuery?: string
  pinnedPapers: Set<string>
  archivedPapers: Set<string>
  onToggleCollapse: () => void
  onNavigateToSection: (sectionKey: string, anchor?: string) => void
  onTogglePin: (fileName: string) => void
  onToggleArchive: (fileName: string) => void
}

export function Toc({ fileNames, papers, activeId, hasMetadata, hasSources, hasSettings, dirtyFileNames, collapsed, activeSectionKey, searchQuery, pinnedPapers, archivedPapers, onToggleCollapse, onNavigateToSection, onTogglePin, onToggleArchive }: Props) {
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
    <nav id="toc" className={collapsed ? 'toc-collapsed' : undefined}>
      <div className="toc-header">
        <button
          className="toc-sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <FaAnglesRight /> : <FaAnglesLeft />}
        </button>
        {!collapsed && <b className="toc-title">Contents</b>}
      </div>
      <div id="toc-inner">
        <ul>
          {hasMetadata && (
            <li>
              <a
                href="#"
                className={activeSectionKey === 'metadata' ? 'active' : undefined}
                onClick={(e) => { e.preventDefault(); onNavigateToSection('metadata') }}
              >
                Metadata
              </a>
            </li>
          )}
          {hasSources && (
            <li>
              <a
                href="#"
                className={activeSectionKey === 'sources' ? 'active' : undefined}
                onClick={(e) => { e.preventDefault(); onNavigateToSection('sources') }}
              >
                Sources
              </a>
            </li>
          )}
          {hasSettings && (
            <li>
              <a
                href="#"
                className={activeSectionKey === 'settings' ? 'active' : undefined}
                onClick={(e) => { e.preventDefault(); onNavigateToSection('settings') }}
              >
                Settings
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
                        const hasMultipleFragments = fragments.length > 1
                        const tableAnchor = hasMultipleFragments
                          ? `${paperId}-table-${tableIdx + 1}`
                          : `${paperId}-table-${tableIdx + 1}-page-${fragments[0]?.page}`
                        const fragmentItems = fragments.map((fragment, fragmentIdx) => ({
                          page: fragment.page,
                          anchorId: `${paperId}-table-${tableIdx + 1}-fragment-${fragmentIdx}-page-${fragment.page}`
                        }))
                        return { tableIdx: tableIdx + 1, tableKey, tableAnchor, fragmentItems }
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
                          href="#"
                          className={activeSectionKey === fileName && activeId === paperId ? 'active' : undefined}
                          onClick={(e) => { e.preventDefault(); onNavigateToSection(fileName) }}
                        >
                          {dirtyFileNames.has(fileName) ? '• ' : ''}{highlightText(fileName, searchQuery ?? '')}
                        </a>
                        <PinButton pinned={pinnedPapers.has(fileName)} onToggle={() => onTogglePin(fileName)} />
                        <ArchiveButton archived={archivedPapers.has(fileName)} onToggle={() => onToggleArchive(fileName)} />
                      </div>

                      {!isPaperCollapsed && tableItems.length > 0 && (
                        <ul className="toc-tables">
                          {tableItems.map(({ tableIdx, tableKey, tableAnchor, fragmentItems }) => {
                            const isTableCollapsed = collapsedTables.has(tableKey)
                            const tableIsActive = activeSectionKey === fileName && (
                              activeId === `${paperId}-table-${tableIdx}` ||
                              activeId.startsWith(`${paperId}-table-${tableIdx}-`)
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
                                    href="#"
                                    className={tableIsActive ? 'active' : undefined}
                                    onClick={(e) => { e.preventDefault(); onNavigateToSection(fileName, tableAnchor) }}
                                  >
                                    {highlightText(`Table ${tableIdx}`, searchQuery ?? '')}
                                  </a>
                                </div>

                                {!isTableCollapsed && fragmentItems.length > 1 && (
                                  <ul className="toc-fragments">
                                    {fragmentItems.map(({ page, anchorId }) => (
                                      <li key={anchorId}>
                                        <a
                                          href="#"
                                          className={activeSectionKey === fileName && activeId === anchorId ? 'active' : undefined}
                                          onClick={(e) => { e.preventDefault(); onNavigateToSection(fileName, anchorId) }}
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
