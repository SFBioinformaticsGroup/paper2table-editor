import type { Metadata, Source } from '../types'
import { flattenMetadataRows, readerEmoji } from '../tableUtils'

function sourceCell(source: Source, key: string): string {
  const value = String(source[key] ?? '')
  if (key === 'uuid') {
    const emoji = readerEmoji(source.reader)
    return emoji ? `${emoji} ${value}` : value
  }
  return value
}

export function MetadataSection({ metadata }: { metadata: Metadata }) {
  const rows = flattenMetadataRows(metadata)
  const sources = metadata.sources ?? []
  const allKeys = new Set(sources.flatMap((s) => Object.keys(s)))
  const preferred = ['uuid', 'reader', 'path']
  const sourceKeys = [
    ...preferred.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !preferred.includes(k)).sort()
  ]

  return (
    <>
      <h2>Metadata</h2>
      {rows.length > 0 && (
        <div className="table-wrapper">
          <table className="table metadata-table">
            <tbody>
              {rows.map(([key, value], i) => (
                <tr key={i}>
                  <th>{key}</th>
                  <td>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sources.length > 0 && (
        <>
          <h3>Sources</h3>
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
        </>
      )}
    </>
  )
}
