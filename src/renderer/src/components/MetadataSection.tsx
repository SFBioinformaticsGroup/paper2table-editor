import type { Metadata, Source } from '../types'
import { flattenMetadataRows, readerEmoji } from '../tableUtils'
import { highlightText } from '../highlightUtils'

interface Props {
  metadata: Metadata
  navigateToSource: (uuid: string) => void
  uuidToFullPath: Map<string, string | null>
  section: 'metadata' | 'sources'
  searchQuery?: string
}

function SourceCell({
  source,
  colKey,
  navigateToSource,
  uuidToFullPath
}: {
  source: Source
  colKey: string
  navigateToSource: (uuid: string) => void
  uuidToFullPath: Map<string, string | null>
}) {
  if (colKey === 'uuid' && source.uuid) {
    const emoji = readerEmoji(source.reader)
    const fullPath = uuidToFullPath.get(source.uuid)
    const navigable = fullPath != null
    return (
      <td>
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
  return <td>{String(source[colKey] ?? '')}</td>
}

export function MetadataSection({ metadata, navigateToSource, uuidToFullPath, section, searchQuery }: Props) {
  const rows = flattenMetadataRows(metadata)
  const sources = metadata.sources ?? []
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['uuid', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

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
                      uuidToFullPath={uuidToFullPath}
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
