import type { TablesFile } from '../types'
import { getTableFragments } from '../tableUtils'

interface Props {
  fileNames: string[]
  papers: Record<string, TablesFile>
  activeId: string
  onSelectPaper: (fileName: string) => void
}

export function Toc({ fileNames, papers, activeId, onSelectPaper }: Props) {
  return (
    <nav id="toc">
      <div id="toc-inner">
        <b>Contents</b>
        <ul>
          {fileNames.map((fileName, paperIdx) => {
            const paperId = `paper-${paperIdx}`
            const content = papers[fileName]
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
                <a
                  href={`#${paperId}`}
                  className={activeId === paperId ? 'active' : undefined}
                  onClick={() => onSelectPaper(fileName)}
                >
                  {fileName}
                </a>
                {fragments.length > 0 && (
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
      </div>
    </nav>
  )
}
