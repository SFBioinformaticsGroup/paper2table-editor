import type { TablesFile, Source } from '../types'
import { collectPaperSourceUuids, getTableFragments, readerEmoji, renderCitation } from '../tableUtils'
import { FragmentTable } from './FragmentTable'

interface Props {
  paperId: string
  paperName: string
  content: TablesFile
  allSources: Source[]
  uuidToReader: Map<string, string>
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

export function PaperSection({ paperId, paperName, content, allSources, uuidToReader }: Props) {
  const paperUuids = collectPaperSourceUuids(content)
  const paperSources = allSources.filter((s) => s.uuid != null && paperUuids.has(s.uuid))

  return (
    <div className="paper">
      <h3 id={paperId}>{paperName}</h3>
      <p>Citation: {renderCitation(content.citation)}</p>
      <PaperSources sources={paperSources} />
      {content.tables.map((table, tableIdx) =>
        getTableFragments(table).map((fragment) => {
          const anchorId = `${paperId}-table-${tableIdx + 1}-page-${fragment.page}`
          return (
            <FragmentTable
              key={anchorId}
              tableIdx={tableIdx + 1}
              fragment={fragment}
              uuidToReader={uuidToReader}
              anchorId={anchorId}
            />
          )
        })
      )}
    </div>
  )
}
