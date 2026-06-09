import { useState } from 'react'
import { FaFloppyDisk, FaFolderOpen, FaRotateLeft, FaRotateRight, FaTrash } from 'react-icons/fa6'
import type { TablesFile, Source } from '../types'
import { collectPaperSourceUuids, getTableFragments, readerEmoji, renderCitation } from '../tableUtils'
import type { EditorCallbacks } from '../editorCallbacks'
import { FragmentTable } from './FragmentTable'
import { TableToolbar } from './TableToolbar'

interface Props {
  paperId: string
  paperName: string
  content: TablesFile
  allSources: Source[]
  uuidToReader: Map<string, string>
  fileName: string
  callbacks: EditorCallbacks
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
}

function sourceCell(source: Source, key: string): string {
  const value = String(source[key] ?? '')
  if (key === 'uuid') {
    const emoji = readerEmoji(source.reader)
    return emoji ? `${emoji} ${value}` : value
  }
  return value
}

function PaperSources({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['uuid', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

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
                {sourceKeys.map((k) => <td key={k}>{sourceCell(source, k)}</td>)}
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
  fileName,
  callbacks,
  canUndo,
  canRedo,
  isDirty
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const paperUuids = collectPaperSourceUuids(content)
  const paperSources = allSources.filter((s) => s.uuid != null && paperUuids.has(s.uuid))

  return (
    <div className="paper">
      <h3 id={paperId}>{paperName}</h3>

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

      <p>Citation: {renderCitation(content.citation)}</p>
      <PaperSources sources={paperSources} />

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
            <h4 id={tableAnchorId}>{headingText}</h4>

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
                  anchorId={anchorId}
                  showFragmentHeading={hasMultipleFragments}
                  fileName={fileName}
                  callbacks={callbacks}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
