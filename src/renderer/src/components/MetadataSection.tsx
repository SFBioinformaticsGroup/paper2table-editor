import type { Metadata, Source } from '../types'
import { flattenMetadataRows, readerEmoji } from '../utils/table'
import { highlightText } from '../highlightUtils'

interface Props {
  metadata: Metadata
  settings?: Record<string, unknown>
  navigateToSource: (id: string) => void
  idToFullPath: Map<string, string | null>
  section: 'metadata' | 'sources' | 'settings'
  searchQuery?: string
}

function SourceCell({
  source,
  colKey,
  navigateToSource,
  idToFullPath
}: {
  source: Source
  colKey: string
  navigateToSource: (id: string) => void
  idToFullPath: Map<string, string | null>
}) {
  if (colKey === 'id' && source.id) {
    const emoji = readerEmoji(source.reader)
    const fullPath = idToFullPath.get(source.id)
    const navigable = fullPath != null
    return (
      <td>
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
  return <td>{String(source[colKey] ?? '')}</td>
}

export function MetadataSection({ metadata, settings, navigateToSource, idToFullPath, section, searchQuery }: Props) {
  const rows = flattenMetadataRows(metadata)
  const sources = metadata.sources ?? []
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['id', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

  if (section === 'settings') {
    const settingsRows = flattenMetadataRows(settings as Metadata ?? {})
    return (
      <>
        <h2 id="settings">Settings</h2>
        {settingsRows.length > 0 && (
          <div className="table-wrapper">
            <table className="table metadata-table">
              <tbody>
                {settingsRows.map(([key, value], i) => (
                  <tr key={i}>
                    <th>{highlightText(key, searchQuery ?? '')}</th>
                    <td style={{ whiteSpace: 'pre-line' }}>{highlightText(value, searchQuery ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    )
  }

  if (section === 'sources') {
    return (
      <>
        <h2 id="sources">Sources</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>{sourceKeys.map((k) => <th key={k}>{k}</th>)}</tr>
            </thead>
            <tbody>
              {sources.map((source, i) => (
                <tr key={i}>
                  {sourceKeys.map((k) => (
                    <SourceCell
                      key={k}
                      source={source}
                      colKey={k}
                      navigateToSource={navigateToSource}
                      idToFullPath={idToFullPath}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 id="metadata">Metadata</h2>
      {rows.length > 0 && (
        <div className="table-wrapper">
          <table className="table metadata-table">
            <tbody>
              {rows.map(([key, value], i) => (
                <tr key={i}>
                  <th>{highlightText(key, searchQuery ?? '')}</th>
                  <td>{highlightText(value, searchQuery ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
