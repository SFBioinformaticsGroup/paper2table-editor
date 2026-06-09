import { useEffect, useRef, useState } from 'react'
import type { DirectoryState, Metadata, TablesFile } from './types'
import { getTableFragments } from './tableUtils'
import { Toc } from './components/Toc'
import { MetadataSection } from './components/MetadataSection'
import { PaperSection } from './components/PaperSection'
import './App.css'

function buildUuidToReader(metadata: Metadata): Map<string, string> {
  const map = new Map<string, string>()
  for (const source of metadata.sources ?? []) {
    if (source.uuid && source.reader) map.set(source.uuid, source.reader)
  }
  return map
}

function buildAnchorIds(state: DirectoryState): string[] {
  const ids: string[] = []
  state.fileNames.forEach((fileName, paperIdx) => {
    const paperId = `paper-${paperIdx}`
    ids.push(paperId)
    const content = state.papers[fileName]
    if (!content) return
    content.tables.forEach((table, tableIdx) => {
      for (const fragment of getTableFragments(table)) {
        ids.push(`${paperId}-table-${tableIdx + 1}-page-${fragment.page}`)
      }
    })
  })
  return ids
}

export function App() {
  const [state, setState] = useState<DirectoryState | null>(null)
  const [appLoading, setAppLoading] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState('')
  const anchorIdsRef = useRef<string[]>([])
  // tracks which papers have been requested to avoid duplicate loads
  const requestedRef = useRef(new Set<string>())

  async function loadPaper(dirPath: string, fileName: string) {
    if (requestedRef.current.has(fileName)) return
    requestedRef.current.add(fileName)
    setLoadingPapers((prev) => ({ ...prev, [fileName]: true }))
    try {
      const result = (await window.api.loadPaper(dirPath, fileName)) as {
        content: TablesFile
        validationErrors: string[]
      }
      setState((prev) => {
        if (!prev || prev.dirPath !== dirPath) return prev
        return {
          ...prev,
          papers: { ...prev.papers, [fileName]: result.content },
          validationErrors:
            result.validationErrors.length > 0
              ? { ...prev.validationErrors, [fileName]: result.validationErrors }
              : prev.validationErrors
        }
      })
    } catch {
      requestedRef.current.delete(fileName)
    } finally {
      setLoadingPapers((prev) => {
        const next = { ...prev }
        delete next[fileName]
        return next
      })
    }
  }

  async function loadDir(dirPath: string) {
    setAppLoading(true)
    requestedRef.current = new Set()
    try {
      const listing = (await window.api.listDirectory(dirPath)) as {
        metadata: Metadata
        fileNames: string[]
      }
      setState({
        dirPath,
        metadata: listing.metadata,
        fileNames: listing.fileNames,
        papers: {},
        validationErrors: {}
      })
      if (listing.fileNames.length > 0) {
        loadPaper(dirPath, listing.fileNames[0])
      }
    } finally {
      setAppLoading(false)
    }
  }

  async function openDirectory() {
    const path = await window.api.openDirectory()
    if (!path) return
    await loadDir(path)
  }

  useEffect(() => {
    return window.api.onDirectorySelected(loadDir)
  }, [])

  // scroll spy
  useEffect(() => {
    if (!state) return
    anchorIdsRef.current = buildAnchorIds(state)
    const handleScroll = () => {
      const scrollY = window.scrollY + 8
      let active = ''
      for (const id of anchorIdsRef.current) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top + window.scrollY <= scrollY) active = id
        else break
      }
      setActiveId(active)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [state])


  if (!state) {
    return (
      <div className="open-dir-screen">
        <h1>Tables Editor</h1>
        {appLoading ? (
          <span className="spinner" aria-label="Loading" />
        ) : (
          <button className="open-dir-btn" onClick={openDirectory}>
            Open directory…
          </button>
        )}
      </div>
    )
  }

  const uuidToReader = buildUuidToReader(state.metadata)
  const allSources = state.metadata.sources ?? []
  const hasMetadata = Object.keys(state.metadata).length > 0

  return (
    <>
      <Toc
        fileNames={state.fileNames}
        papers={state.papers}
        activeId={activeId}
        onSelectPaper={(fileName) => loadPaper(state.dirPath, fileName)}
      />
      <main>
        {appLoading && (
          <div className="loading-overlay">
            <span className="spinner" aria-label="Loading" />
          </div>
        )}
        <div className="toolbar">
          {state.dirPath && <span className="dir-path">{state.dirPath}</span>}
        </div>
        <h1>Paper2Table Viewer</h1>
        {hasMetadata && <MetadataSection metadata={state.metadata} />}
        <h2>Papers</h2>
        {state.fileNames.map((fileName, paperIdx) => {
          const paperId = `paper-${paperIdx}`
          const content = state.papers[fileName]
          const isLoading = loadingPapers[fileName]

          if (!content) {
            return (
              <div
                key={fileName}
                id={paperId}
                data-paper-file={fileName}
                className={isLoading ? 'paper-placeholder loading' : 'paper-placeholder'}
              >
                {isLoading && <span className="spinner" aria-label="Loading" />}
              </div>
            )
          }

          return (
            <div key={fileName}>
              {state.validationErrors[fileName] && (
                <details className="validation-errors" open>
                  <summary>
                    Schema validation errors in <code>{fileName}</code>{' '}
                    ({state.validationErrors[fileName].length})
                  </summary>
                  <ul>
                    {state.validationErrors[fileName].map((msg, i) => (
                      <li key={i}><code>{msg}</code></li>
                    ))}
                  </ul>
                </details>
              )}
              <PaperSection
                paperId={paperId}
                paperName={fileName}
                content={content}
                allSources={allSources}
                uuidToReader={uuidToReader}
              />
            </div>
          )
        })}
      </main>
    </>
  )
}
