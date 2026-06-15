import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6'
import type {
  DirectoryState,
  EditHistories,
  Metadata,
  PaperHistory,
  PaperState,
  ResolvedSource,
  TablesFile
} from './types'
import { getTableFragments } from './tableUtils'
import * as actions from './editorActions'
import type { EditorCallbacks } from './editorCallbacks'
import { Toc } from './components/Toc'
import { MetadataSection } from './components/MetadataSection'
import { PaperSection } from './components/PaperSection'
import { FindBar } from './components/FindBar'
import './App.css'

// ── history reducer ──────────────────────────────────────────────────────────

type HistoryAction =
  | { type: 'APPLY'; fileName: string; newState: PaperState }
  | { type: 'UNDO'; fileName: string }
  | { type: 'REDO'; fileName: string }
  | { type: 'MARK_SAVED'; fileName: string }
  | { type: 'RESET'; fileName: string; fresh: TablesFile }

function historyReducer(state: EditHistories, action: HistoryAction): EditHistories {
  const fileName = action.fileName
  const entry = state[fileName]

  if (action.type === 'RESET') {
    const h: PaperHistory = {
      past: [],
      present: action.fresh,
      future: [],
      savedSnapshot: action.fresh
    }
    return { ...state, [fileName]: h }
  }

  if (!entry) return state

  if (action.type === 'APPLY') {
    const h: PaperHistory = {
      past: [...entry.past, entry.present],
      present: action.newState,
      future: [],
      savedSnapshot: entry.savedSnapshot
    }
    return { ...state, [fileName]: h }
  }

  if (action.type === 'UNDO') {
    if (entry.past.length === 0) return state
    const prev = entry.past[entry.past.length - 1]
    const h: PaperHistory = {
      past: entry.past.slice(0, -1),
      present: prev,
      future: [entry.present, ...entry.future],
      savedSnapshot: entry.savedSnapshot
    }
    return { ...state, [fileName]: h }
  }

  if (action.type === 'REDO') {
    if (entry.future.length === 0) return state
    const next = entry.future[0]
    const h: PaperHistory = {
      past: [...entry.past, entry.present],
      present: next,
      future: entry.future.slice(1),
      savedSnapshot: entry.savedSnapshot
    }
    return { ...state, [fileName]: h }
  }

  if (action.type === 'MARK_SAVED') {
    const h: PaperHistory = { ...entry, savedSnapshot: entry.present }
    return { ...state, [fileName]: h }
  }

  return state
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildUuidToReader(metadata: Metadata): Map<string, string> {
  const map = new Map<string, string>()
  for (const source of metadata.sources ?? []) {
    if (source.uuid && source.reader) map.set(source.uuid, source.reader)
  }
  return map
}

function buildUuidToFullPath(resolvedSources: Record<string, ResolvedSource>): Map<string, string | null> {
  const map = new Map<string, string | null>()
  for (const [uuid, info] of Object.entries(resolvedSources)) {
    map.set(uuid, info.fullPath)
  }
  return map
}

function buildAnchorIds(state: DirectoryState, histories: EditHistories): string[] {
  const ids: string[] = []
  if (Object.keys(state.metadata).length > 0) ids.push('metadata')
  if ((state.metadata.sources?.length ?? 0) > 0) ids.push('sources')
  state.fileNames.forEach((fileName, paperIdx) => {
    const paperId = `paper-${paperIdx}`
    ids.push(paperId)
    const content = histories[fileName]?.present ?? state.papers[fileName]
    if (!content) return
    content.tables.forEach((table, tableIdx) => {
      for (const fragment of getTableFragments(table)) {
        ids.push(`${paperId}-table-${tableIdx + 1}-page-${fragment.page}`)
      }
    })
  })
  return ids
}

// ── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [state, setState] = useState<DirectoryState | null>(null)
  const [appLoading, setAppLoading] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState('')
  const [histories, dispatchHistory] = useReducer(historyReducer, {})
  const [navBack, setNavBack] = useState<Array<{ dirPath: string; fileName: string; scrollY: number }>>([])
  const [navForward, setNavForward] = useState<Array<{ dirPath: string; fileName: string; scrollY: number }>>([])
  const [focusedFileName, setFocusedFileName] = useState('')
  const [findBarOpen, setFindBarOpen] = useState(false)
  const [tocCollapsed, setTocCollapsed] = useState(false)
  const anchorIdsRef = useRef<string[]>([])
  const requestedRef = useRef(new Set<string>())
  const focusedPaperRef = useRef<string>('')
  const pendingScrollRef = useRef<{ fileName: string; scrollY: number } | null>(null)

  // current visible content for a paper (edited or original)
  const getPaperContent = useCallback(
    (fileName: string, st: DirectoryState): TablesFile | null => {
      const present = histories[fileName]?.present
      if (present !== undefined) return present
      return st.papers[fileName] ?? null
    },
    [histories]
  )

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
      dispatchHistory({ type: 'RESET', fileName, fresh: result.content })
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
      const sourcesInput = (listing.metadata.sources ?? [])
        .filter((s) => s.uuid && s.path)
        .map((s) => ({ uuid: String(s.uuid), path: String(s.path) }))
      const resolved = await window.api.resolveSources(dirPath, sourcesInput)
      const resolvedSources: Record<string, ResolvedSource> = {}
      for (const { uuid, fullPath, isDir } of resolved) {
        resolvedSources[uuid] = { fullPath, isDir }
      }
      setState({
        dirPath,
        metadata: listing.metadata,
        resolvedSources,
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

  // ── edit helpers ──────────────────────────────────────────────────────────

  const applyEdit = useCallback(
    (fileName: string, transform: (f: TablesFile) => TablesFile) => {
      const current = histories[fileName]?.present ?? state?.papers[fileName]
      if (!current) return
      dispatchHistory({ type: 'APPLY', fileName, newState: transform(current) })
    },
    [histories, state]
  )

  const applyDelete = useCallback((fileName: string) => {
    dispatchHistory({ type: 'APPLY', fileName, newState: null })
  }, [])

  // ── save/load ─────────────────────────────────────────────────────────────

  const savePaperFn = useCallback(
    async (fileName: string) => {
      if (!state) return
      const entry = histories[fileName]
      if (!entry) return
      if (entry.present === null) {
        await window.api.deletePaper(state.dirPath, fileName)
        dispatchHistory({ type: 'MARK_SAVED', fileName })
        setState((prev) => {
          if (!prev) return prev
          return { ...prev, fileNames: prev.fileNames.filter((f) => f !== fileName) }
        })
      } else {
        const content = JSON.stringify(entry.present, null, 2)
        await window.api.savePaper(state.dirPath, fileName, content)
        dispatchHistory({ type: 'MARK_SAVED', fileName })
      }
    },
    [state, histories]
  )

  const savePaperAsFn = useCallback(
    async (fileName: string) => {
      if (!state) return
      const entry = histories[fileName]
      if (!entry || entry.present === null) return
      const content = JSON.stringify(entry.present, null, 2)
      const result = await window.api.savePaperAs(state.dirPath, fileName, content)
      if (!result.ok || !result.filePath) return
      const newName = result.filePath.split('/').pop()!
      setState((prev) => {
        if (!prev) return prev
        if (prev.fileNames.includes(newName)) return prev
        return { ...prev, fileNames: [...prev.fileNames, newName] }
      })
      dispatchHistory({ type: 'RESET', fileName: newName, fresh: entry.present as TablesFile })
    },
    [state, histories]
  )

  // ── navigation ────────────────────────────────────────────────────────────

  function scrollToPaper(fileName: string) {
    if (!state) return
    const idx = state.fileNames.indexOf(fileName)
    if (idx === -1) return
    const el = document.getElementById(`paper-${idx}`)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  const navigateToSourceFn = useCallback(
    (uuid: string) => {
      if (!state) return
      const info = state.resolvedSources[uuid]
      if (!info) return

      const dirtyCount = Object.values(histories).filter(
        (h) => h.present !== h.savedSnapshot
      ).length
      if (
        dirtyCount > 0 &&
        !window.confirm(`You have ${dirtyCount} unsaved paper(s). Navigate anyway?`)
      ) return

      const entry = { dirPath: state.dirPath, fileName: focusedPaperRef.current, scrollY: window.scrollY }
      setNavBack((prev) => [...prev, entry])
      setNavForward([])

      const normalizedDir = state.dirPath.replace(/\/$/, '')

      if (info.isDir) {
        // Source path is a directory — load it directly
        if (info.fullPath === normalizedDir) return  // already here
        loadDir(info.fullPath)
      } else {
        // Source path is a file
        const lastSlash = info.fullPath.lastIndexOf('/')
        const targetDir = info.fullPath.substring(0, lastSlash)
        const targetFile = info.fullPath.substring(lastSlash + 1)
        if (targetDir === normalizedDir) {
          if (!state.papers[targetFile] && !histories[targetFile]) {
            loadPaper(state.dirPath, targetFile)
          }
          setTimeout(() => scrollToPaper(targetFile), 80)
        } else {
          pendingScrollRef.current = { fileName: targetFile, scrollY: 0 }
          loadDir(targetDir)
        }
      }
    },
    [state, histories]
  )

  const navigateBackFn = useCallback(() => {
    if (!state || navBack.length === 0) return
    const entry = navBack[navBack.length - 1]
    const current = { dirPath: state.dirPath, fileName: focusedPaperRef.current, scrollY: window.scrollY }
    setNavBack((prev) => prev.slice(0, -1))
    setNavForward((prev) => [current, ...prev])
    if (entry.dirPath !== state.dirPath) {
      pendingScrollRef.current = { fileName: entry.fileName, scrollY: entry.scrollY }
      loadDir(entry.dirPath)
    } else {
      scrollToPaper(entry.fileName)
      setTimeout(() => window.scrollTo({ top: entry.scrollY, behavior: 'smooth' }), 80)
    }
  }, [navBack, state])

  const navigateForwardFn = useCallback(() => {
    if (!state || navForward.length === 0) return
    const entry = navForward[0]
    const current = { dirPath: state.dirPath, fileName: focusedPaperRef.current, scrollY: window.scrollY }
    setNavForward((prev) => prev.slice(1))
    setNavBack((prev) => [...prev, current])
    if (entry.dirPath !== state.dirPath) {
      pendingScrollRef.current = { fileName: entry.fileName, scrollY: entry.scrollY }
      loadDir(entry.dirPath)
    } else {
      scrollToPaper(entry.fileName)
      setTimeout(() => window.scrollTo({ top: entry.scrollY, behavior: 'smooth' }), 80)
    }
  }, [navForward, state])

  // ── callbacks ─────────────────────────────────────────────────────────────

  const callbacks: EditorCallbacks = useMemo(
    () => ({
      deletePaper: applyDelete,
      undo: (fileName) => dispatchHistory({ type: 'UNDO', fileName }),
      redo: (fileName) => dispatchHistory({ type: 'REDO', fileName }),
      savePaper: savePaperFn,
      savePaperAs: savePaperAsFn,
      navigateToSource: navigateToSourceFn,
      deleteTable: (fileName, tableIdx) =>
        applyEdit(fileName, (f) => actions.deleteTable(f, tableIdx)),
      deleteFragment: (fileName, tableIdx, fragmentIdx) =>
        applyEdit(fileName, (f) => actions.deleteFragment(f, tableIdx, fragmentIdx)),
      compactFragments: (fileName, tableIdx) =>
        applyEdit(fileName, (f) => actions.compactFragments(f, tableIdx)),
      mergeWithNextTable: (fileName, tableIdx) =>
        applyEdit(fileName, (f) => actions.mergeWithNextTable(f, tableIdx)),
      deleteRow: (fileName, tableIdx, fragmentIdx, rowIdx) =>
        applyEdit(fileName, (f) => actions.deleteRow(f, tableIdx, fragmentIdx, rowIdx)),
      promoteRowToHeader: (fileName, tableIdx, fragmentIdx, rowIdx) =>
        applyEdit(fileName, (f) => actions.promoteRowToHeader(f, tableIdx, fragmentIdx, rowIdx)),
      deleteColumn: (fileName, tableIdx, colName) =>
        applyEdit(fileName, (f) => actions.deleteColumn(f, tableIdx, colName)),
      renameColumn: (fileName, tableIdx, oldName, newName) =>
        applyEdit(fileName, (f) => actions.renameColumn(f, tableIdx, oldName, newName)),
      mergeColumns: (fileName, tableIdx, keepCol, dropCol) =>
        applyEdit(fileName, (f) => actions.mergeColumns(f, tableIdx, keepCol, dropCol)),
      editCell: (fileName, tableIdx, fragmentIdx, rowIdx, colName, newValue) =>
        applyEdit(fileName, (f) =>
          actions.editCell(f, tableIdx, fragmentIdx, rowIdx, colName, newValue)
        )
    }),
    [applyEdit, applyDelete, savePaperFn, savePaperAsFn, navigateToSourceFn]
  )

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    return window.api.onDirectorySelected(loadDir)
  }, [])

  // After cross-dir navigation: load target paper and scroll to it
  useEffect(() => {
    const pending = pendingScrollRef.current
    if (!state || !pending) return
    pendingScrollRef.current = null
    if (!state.papers[pending.fileName] && !requestedRef.current.has(pending.fileName)) {
      loadPaper(state.dirPath, pending.fileName)
    }
    const targetScrollY = pending.scrollY
    setTimeout(() => {
      scrollToPaper(pending.fileName)
      if (targetScrollY > 0) {
        setTimeout(() => window.scrollTo({ top: targetScrollY, behavior: 'smooth' }), 80)
      }
    }, 80)
  }, [state?.dirPath])

  useEffect(() => {
    const anyDirty = Object.entries(histories).some(
      ([, h]) => h.present !== h.savedSnapshot
    )
    document.title = state?.dirPath
      ? `${anyDirty ? '• ' : ''}${state.dirPath} — Tables Editor`
      : 'Tables Editor'
  }, [state?.dirPath, histories])

  // IPC-triggered save/undo/redo (from menu)
  useEffect(() => {
    const u1 = window.api.onSaveCurrentPaper(() => {
      const name = focusedPaperRef.current
      if (name) savePaperFn(name)
    })
    const u2 = window.api.onSaveCurrentPaperAs(() => {
      const name = focusedPaperRef.current
      if (name) savePaperAsFn(name)
    })
    const u3 = window.api.onUndoPaper(() => {
      const name = focusedPaperRef.current
      if (name) dispatchHistory({ type: 'UNDO', fileName: name })
    })
    const u4 = window.api.onRedoPaper(() => {
      const name = focusedPaperRef.current
      if (name) dispatchHistory({ type: 'REDO', fileName: name })
    })
    const u5 = window.api.onNavigateBack(navigateBackFn)
    const u6 = window.api.onNavigateForward(navigateForwardFn)
    const u7 = window.api.onOpenFindBar(() => setFindBarOpen(true))
    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7() }
  }, [savePaperFn, savePaperAsFn, navigateBackFn, navigateForwardFn])

  const closeFindBar = useCallback(() => {
    setFindBarOpen(false)
    window.api.stopFindInPage()
  }, [])

  // scroll spy
  useEffect(() => {
    if (!state) return
    anchorIdsRef.current = buildAnchorIds(state, histories)
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

      // track focused paper for menu shortcuts and toolbar buttons
      let newFocused = focusedPaperRef.current
      for (const [i, fileName] of state.fileNames.entries()) {
        const el = document.getElementById(`paper-${i}`)
        if (!el) continue
        if (el.getBoundingClientRect().top + window.scrollY <= scrollY + 200) {
          newFocused = fileName
        }
      }
      if (newFocused !== focusedPaperRef.current) {
        focusedPaperRef.current = newFocused
        setFocusedFileName(newFocused)
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [state, histories])

  // ── render ────────────────────────────────────────────────────────────────

  if (!state) {
    return (
      <>
        {findBarOpen && <FindBar onClose={closeFindBar} />}
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
      </>
    )
  }

  const uuidToReader = buildUuidToReader(state.metadata)
  const uuidToFullPath = buildUuidToFullPath(state.resolvedSources)
  const allSources = state.metadata.sources ?? []
  const hasMetadata = Object.keys(state.metadata).length > 0
  const hasSources = (state.metadata.sources?.length ?? 0) > 0

  const dirtyFileNames = new Set(
    Object.entries(histories)
      .filter(([, h]) => h.present !== h.savedSnapshot)
      .map(([name]) => name)
  )

  const focusedEntry = histories[focusedFileName]
  const canUndoFocused = (focusedEntry?.past.length ?? 0) > 0
  const focusedDirty = dirtyFileNames.has(focusedFileName)
  const hasFocused = Boolean(focusedFileName)

  return (
    <>
      {findBarOpen && <FindBar onClose={closeFindBar} />}
      <Toc
        fileNames={state.fileNames}
        papers={state.papers}
        activeId={activeId}
        hasMetadata={hasMetadata}
        hasSources={hasSources}
        dirtyFileNames={dirtyFileNames}
        collapsed={tocCollapsed}
        onToggleCollapse={() => setTocCollapsed((v) => !v)}
        onSelectPaper={(fileName) => loadPaper(state.dirPath, fileName)}
      />
      <div className="main-wrapper">
        <div className="dir-header">
          <div className="nav-buttons">
            <button
              className="nav-btn"
              title="Back (Cmd+[)"
              disabled={navBack.length === 0}
              onClick={navigateBackFn}
            >
              <FaChevronLeft />
            </button>
            <button
              className="nav-btn"
              title="Forward (Cmd+])"
              disabled={navForward.length === 0}
              onClick={navigateForwardFn}
            >
              <FaChevronRight />
            </button>
          </div>
          <span className="dir-path">{state.dirPath}</span>
          <div className="header-actions">
            <button
              className="toolbar-btn"
              title="Undo (Cmd+Z)"
              disabled={!canUndoFocused}
              onClick={() => { if (focusedFileName) callbacks.undo(focusedFileName) }}
            >
              <FaRotateLeft />
            </button>
            <button
              className={`toolbar-btn save-btn${focusedDirty ? ' dirty' : ''}`}
              title="Save (Cmd+S)"
              disabled={!focusedDirty}
              onClick={() => { if (focusedFileName) callbacks.savePaper(focusedFileName) }}
            >
              <FaFloppyDisk /> {focusedDirty ? 'Save*' : 'Save'}
            </button>
            <button
              className="toolbar-btn"
              title="Save As…"
              onClick={() => { if (focusedFileName) callbacks.savePaperAs(focusedFileName) }}
            >
              <FaFloppyDisk /> Save As…
            </button>
          </div>
        </div>
        <main>
        {appLoading && (
          <div className="loading-overlay">
            <span className="spinner" aria-label="Loading" />
          </div>
        )}
        {hasMetadata && (
          <MetadataSection
            metadata={state.metadata}
            navigateToSource={callbacks.navigateToSource}
            uuidToFullPath={uuidToFullPath}
          />
        )}
        <h2>Papers</h2>
        {state.fileNames.map((fileName, paperIdx) => {
          const paperId = `paper-${paperIdx}`
          const history = histories[fileName]
          const content = history?.present ?? state.papers[fileName]
          const isLoading = loadingPapers[fileName]

          // paper deleted
          if (history?.present === null) return null

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

          const canUndo = (history?.past.length ?? 0) > 0
          const canRedo = (history?.future.length ?? 0) > 0
          const isDirty = dirtyFileNames.has(fileName)

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
                uuidToFullPath={uuidToFullPath}
                fileName={fileName}
                callbacks={callbacks}
                canUndo={canUndo}
                canRedo={canRedo}
                isDirty={isDirty}
              />
            </div>
          )
        })}
        </main>
      </div>
    </>
  )
}
