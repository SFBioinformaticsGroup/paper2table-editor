import { useState } from 'react'
import { FaArrowsRotate, FaFloppyDisk, FaFolderOpen, FaObjectGroup, FaPlay, FaRotateLeft, FaRotateRight, FaTrash } from 'react-icons/fa6'
import type { CellClipboard, CellSelection, TablesFile, Source, Curation } from '../types'
import type { EditorCallbacks } from '../editorCallbacks'
import { FragmentTable } from './FragmentTable'
import { TableToolbar } from './TableToolbar'
import { NoteButton } from './NoteButton'
import { highlightText } from '../highlightUtils'
import { getTableFragments } from '../utils/getTableFragments'
import { readerEmoji, collectPaperSourceUuids, renderCitationItems, columnNames } from '../utils/table'
import { hasNonSemanticColumns } from '../actions/applyPrevFragmentColumnNames'

interface Props {
  paperId: string
  paperName: string
  content: TablesFile
  allSources: Source[]
  idToReader: Map<string, string>
  idToFullPath: Map<string, string | null>
  fileName: string
  callbacks: EditorCallbacks
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  searchQuery?: string
  showEmptyRows: boolean
  paperNote: string
  onUpdatePaperNote: (fileName: string, text: string) => void
  isReloading: boolean
  hasTablemergeSettings: boolean
  isRerunning: boolean
  cellSelection: CellSelection | null
  cellClipboard: CellClipboard | null
  onCellMouseDown: (fileName: string, tableIdx: number, fragmentIdx: number, rowOriginalIdx: number, editableColIdx: number, isShift: boolean) => void
  onCellMouseOver: (fileName: string, tableIdx: number, fragmentIdx: number, rowOriginalIdx: number, editableColIdx: number) => void
}

function PaperSources({
  sources,
  navigateToSource,
  idToFullPath
}: {
  sources: Source[]
  navigateToSource: (id: string) => void
  idToFullPath: Map<string, string | null>
}) {
  if (sources.length === 0) return null
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['id', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

  function renderCell(source: Source, key: string) {
    if (key === 'id' && source.id) {
      const emoji = readerEmoji(source.reader)
      const fullPath = idToFullPath.get(source.id)
      const navigable = fullPath != null
      return (
        <td key={key}>
          {emoji && <span style={{ marginRight: 4 }}>{emoji}</span>}
          {navigable ? (
            <a
              className="id-chip"
              title={fullPath}
              href="#"
              onClick={(e) => { e.preventDefault(); navigateToSource(source.id!) }}
            >
              {source.id.slice(0, 8)}
            </a>
          ) : (
            <span className="id-chip id-chip-dead" title={source.id}>
              {source.id.slice(0, 8)}
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

function PaperCurations({ curations }: { curations: Curation[] }) {
  if (curations.length === 0) return null
  return (
    <details className="paper-curations">
      <summary>Curations ({curations.length})</summary>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>curator</th>
              <th>timestamp</th>
              <th>description</th>
            </tr>
          </thead>
          <tbody>
            {curations.map((curation, i) => (
              <tr key={i}>
                <td>{curation.curator}</td>
                <td>{curation.timestamp}</td>
                <td>{curation.description}</td>
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
  idToReader,
  idToFullPath,
  fileName,
  callbacks,
  canUndo,
  canRedo,
  isDirty,
  searchQuery,
  showEmptyRows,
  paperNote,
  onUpdatePaperNote,
  isReloading,
  hasTablemergeSettings,
  isRerunning,
  cellSelection,
  cellClipboard,
  onCellMouseDown,
  onCellMouseOver
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const paperUuids = collectPaperSourceUuids(content)
  const paperSources = allSources.filter((s) => s.id != null && paperUuids.has(s.id))

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
        <button
          className="toolbar-btn"
          title="Reload from disk (discards unsaved changes)"
          disabled={isReloading}
          onClick={() => callbacks.reloadPaper(fileName)}
        >
          {isReloading ? <span className="spinner" aria-label="Loading" /> : <FaArrowsRotate />} Reload
        </button>
        {hasTablemergeSettings && (
          <button
            className="toolbar-btn"
            title="Rerun tablemerge for this paper"
            disabled={isRerunning}
            onClick={() => callbacks.rerunTablemerge(fileName)}
            style={{ display: 'none' }}
          >
            {isRerunning ? <span className="spinner" aria-label="Loading" /> : <FaPlay />} Rerun
          </button>
        )}
        <NoteButton
          note={paperNote}
          onSave={(text) => onUpdatePaperNote(fileName, text)}
        />
        {content.tables.length > 1 && (
          <button
            className="toolbar-btn"
            title="Merge all tables' fragments into a single table"
            onClick={() => callbacks.mergeAllFragments(fileName)}
          >
            <FaObjectGroup /> Merge All Tables
          </button>
        )}
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

      <p>Citation:</p>
      <ul>
        {renderCitationItems(content.citation).map((item, index) => (
          <li key={index}>{highlightText(item, searchQuery ?? '')}</li>
        ))}
      </ul>
      <PaperSources
        sources={paperSources}
        navigateToSource={callbacks.navigateToSource}
        idToFullPath={idToFullPath}
      />
      <PaperCurations
        curations={
          Array.isArray(content.metadata?.['curations'])
            ? (content.metadata!['curations'] as Curation[])
            : []
        }
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
              isFirstTable={tableIdx === 0}
              isLastTable={isLastTable}
              callbacks={callbacks}
            />

            {fragments.map((fragment, fragmentIdx) => {
              const anchorId = hasMultipleFragments
                ? `${paperId}-table-${tableIdx + 1}-fragment-${fragmentIdx}-page-${fragment.page}`
                : undefined
              const canApplyPrevColumnNames = fragmentIdx > 0 && (() => {
                const prevCols = columnNames(fragments[fragmentIdx - 1].rows)
                const currentCols = columnNames(fragment.rows)
                return hasNonSemanticColumns(currentCols) && currentCols.length >= prevCols.length
              })()
              return (
                <FragmentTable
                  key={`${tableIdx}-${fragmentIdx}`}
                  tableIdx={tableIdx + 1}
                  tableIdxZero={tableIdx}
                  fragmentIdx={fragmentIdx}
                  fragment={fragment}
                  idToReader={idToReader}
                  idToFullPath={idToFullPath}
                  anchorId={anchorId}
                  showFragmentHeading={hasMultipleFragments}
                  fileName={fileName}
                  callbacks={callbacks}
                  searchQuery={searchQuery}
                  showEmptyRows={showEmptyRows}
                  hasNextFragment={fragmentIdx < fragments.length - 1}
                  canApplyPrevColumnNames={canApplyPrevColumnNames}
                  cellSelection={cellSelection}
                  cellClipboard={cellClipboard}
                  onCellMouseDown={onCellMouseDown}
                  onCellMouseOver={onCellMouseOver}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
