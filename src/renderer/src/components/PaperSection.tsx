import { useState } from 'react'
import { FaFloppyDisk, FaFolderOpen, FaRotateLeft, FaRotateRight, FaTrash } from 'react-icons/fa6'
import type { TablesFile, Source } from '../types'
import type { EditorCallbacks } from '../editorCallbacks'
import { FragmentTable } from './FragmentTable'
import { TableToolbar } from './TableToolbar'
import { highlightText } from '../highlightUtils'
import { getTableFragments } from '../utils/getTableFragments'
import { readerEmoji, collectPaperSourceUuids, renderCitation } from '../utils/table'

interface Props {
  paperId: string
  paperName: string
  content: TablesFile
  allSources: Source[]
  uuidToReader: Map<string, string>
  uuidToFullPath: Map<string, string | null>
  fileName: string
  callbacks: EditorCallbacks
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  searchQuery?: string
  showEmptyRows: boolean
}

function PaperSources({
  sources,
  navigateToSource,
  uuidToFullPath
}: {
  sources: Source[]
  navigateToSource: (uuid: string) => void
  uuidToFullPath: Map<string, string | null>
}) {
  if (sources.length === 0) return null
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['uuid', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

  function renderCell(source: Source, key: string) {
    if (key === 'uuid' && source.uuid) {
      const emoji = readerEmoji(source.reader)
      const fullPath = uuidToFullPath.get(source.uuid)
      const navigable = fullPath != null
      return (
        <td key={key}>
          {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
          {navigable ? (
            <a
              className="uuid-chip"
              title={fullPath}
              href="#"
              onClick={(e) => { e.preventDefault(); navigateToSource(source.uuid!) }}
            >
              {source.uuid.slice(0, 8)}
            </a>
          ) : (
            <span className="uuid-chip uuid-chip-dead" title={source.uuid}>
              {source.uuid.slice(0, 8)}
            </span>
          )}
        </td>
      )
    }
    return <td key={key}>{String(source[key] ?? '')}</td>
  }

  return (
    <details className="paper-sources">
      <summary>Sources ({sources.length})</summary>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>{sourceKeys.map((k) => <th key={k}>{k}</th>)}</tr>
          </thead>
          <tbody>
            {sources.map((source, i) => (
              <tr key={i}>
                {sourceKeys.map((k) => renderCell(source, k))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function PaperSection({
  paperId,
  paperName,
  content,
  allSources,
  uuidToReader,
  uuidToFullPath,
  fileName,
  callbacks,
  canUndo,
  canRedo,
  isDirty,
  searchQuery,
  showEmptyRows
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const paperUuids = collectPaperSourceUuids(content)
  const paperSources = allSources.filter((s) => s.uuid != null && paperUuids.has(s.uuid))

  return (
    <div className="paper">
      <h2 id={paperId}>{highlightText(paperName, searchQuery ?? '')}</h2>

      <div className="paper-toolbar">
        <button
          className="toolbar-btn"
          title="Undo"
          disabled={!canUndo}
          onClick={() => callbacks.undo(fileName)}
        >
          <FaRotateLeft />
        </button>
        <button
          className="toolbar-btn"
          title="Redo"
          disabled={!canRedo}
          onClick={() => callbacks.redo(fileName)}
        >
          <FaRotateRight />
        </button>
        <button
          className={`toolbar-btn save-btn${isDirty ? ' dirty' : ''}`}
          title="Save"
          onClick={() => callbacks.savePaper(fileName)}
        >
          <FaFloppyDisk /> {isDirty ? 'Save*' : 'Save'}
        </button>
        <button
          className="toolbar-btn"
          title="Save As…"
          onClick={() => callbacks.savePaperAs(fileName)}
        >
          <FaFolderOpen /> Save As…
        </button>
        {confirmDelete ? (
          <span className="delete-confirm">
            Delete file?{' '}
            <button
              className="toolbar-btn danger"
              onClick={() => { setConfirmDelete(false); callbacks.deletePaper(fileName) }}
            >
              Yes
            </button>{' '}
            <button className="toolbar-btn" onClick={() => setConfirmDelete(false)}>
              No
            </button>
          </span>
        ) : (
          <button
            className="toolbar-btn danger"
            title="Mark this paper for deletion (saved to disk on Save)"
            onClick={() => setConfirmDelete(true)}
          >
            <FaTrash /> Delete paper
          </button>
        )}
      </div>

      <p>Citation: {highlightText(renderCitation(content.citation), searchQuery ?? '')}</p>
      <PaperSources
        sources={paperSources}
        navigateToSource={callbacks.navigateToSource}
        uuidToFullPath={uuidToFullPath}
      />

      {content.tables.map((table, tableIdx) => {
        const fragments = getTableFragments(table)
        const hasMultipleFragments = fragments.length > 1
        const hasFragments = 'table_fragments' in table && hasMultipleFragments
        const isLastTable = tableIdx === content.tables.length - 1
        const tableTitle = table.title

        // Single-fragment: anchor is the fragment anchor so scroll-spy tracks it.
        // Multi-fragment: a dedicated table-level anchor; each fragment h5 keeps its own anchor.
        const tableAnchorId = hasMultipleFragments
          ? `${paperId}-table-${tableIdx + 1}`
          : `${paperId}-table-${tableIdx + 1}-page-${fragments[0]?.page}`

        const headingText =
          `Table ${tableIdx + 1}` +
          (tableTitle ? ` — ${tableTitle}` : '') +
          (!hasMultipleFragments && fragments[0] ? `, p. ${fragments[0].page}` : '')

        return (
          <div key={tableIdx} className="table-section">
            <h3 id={tableAnchorId}>{highlightText(headingText, searchQuery ?? '')}</h3>

            <TableToolbar
              fileName={fileName}
              tableIdx={tableIdx}
              hasFragments={hasFragments}
              isLastTable={isLastTable}
              callbacks={callbacks}
            />

            {fragments.map((fragment, fragmentIdx) => {
              const anchorId = hasMultipleFragments
                ? `${paperId}-table-${tableIdx + 1}-page-${fragment.page}`
                : undefined
              return (
                <FragmentTable
                  key={`${tableIdx}-${fragmentIdx}`}
                  tableIdx={tableIdx + 1}
                  tableIdxZero={tableIdx}
                  fragmentIdx={fragmentIdx}
                  fragment={fragment}
                  uuidToReader={uuidToReader}
                  uuidToFullPath={uuidToFullPath}
                  anchorId={anchorId}
                  showFragmentHeading={hasMultipleFragments}
                  fileName={fileName}
                  callbacks={callbacks}
                  searchQuery={searchQuery}
                  showEmptyRows={showEmptyRows}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
