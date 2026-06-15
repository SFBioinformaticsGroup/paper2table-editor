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
import { buildPaperAnchorIds } from './tableUtils'
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

function buildSectionAnchorIds(sectionKey: string, state: DirectoryState, histories: EditHistories): string[] {
  if (sectionKey === 'metadata') return ['metadata']
  if (sectionKey === 'sources') return ['sources']
  const paperIdx = state.fileNames.indexOf(sectionKey)
  if (paperIdx === -1) return []
  const paperId = `paper-${paperIdx}`
  const content = histories[sectionKey]?.present ?? state.papers[sectionKey]
  if (!content) return [paperId]
  return buildPaperAnchorIds(paperId, content.tables)
}

// ── App ──────────────────────────────────────────────────────────────────────

export function App() {
  const [state, setState] = useState<DirectoryState | null>(null)
  const [appLoading, setAppLoading] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState('')
  const [histories, dispatchHistory] = useReducer(historyReducer, {})
  const [navBack, setNavBack] = useState<Array<{ dirPath: string; sectionKey: string; scrollY: number }>>([])
  const [navForward, setNavForward] = useState<Array<{ dirPath: string; sectionKey: string; scrollY: number }>>([])
  const [focusedFileName, setFocusedFileName] = useState('')
  const [findBarOpen, setFindBarOpen] = useState(false)
  const [tocCollapsed, setTocCollapsed] = useState(false)
  const [activeSectionKey, setActiveSectionKey] = useState<string>('')
  const requestedRef = useRef(new Set<string>())
  const focusedPaperRef = useRef<string>('')
  const pendingNavRef = useRef<{ sectionKey: string; scrollY: number } | null>(null)
  const sectionViewRef = useRef<HTMLDivElement>(null)
  const sectionScrollYRef = useRef<number>(0)
  const pendingAnchorRef = useRef<string | null>(null)
  const pendingScrollYRef = useRef<number | null>(null)
  const activeSectionKeyRef = useRef<string>('')

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
      const hasMetadata = Object.keys(listing.metadata).length > 0
      setState({
        dirPath,
        metadata: listing.metadata,
        resolvedSources,
        fileNames: listing.fileNames,
        papers: {},
        validationErrors: {}
      })
      setActiveSectionKey(hasMetadata ? 'metadata' : listing.fileNames[0] ?? '')
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

  function navigateToSection(sectionKey: string, anchorId?: string) {
    if (!state) return
    if (state.fileNames.includes(sectionKey)) loadPaper(state.dirPath, sectionKey)
    if (sectionKey === activeSectionKey) {
      if (anchorId) {
        const container = sectionViewRef.current
        const el = document.getElementById(anchorId)
        if (container && el) {
          container.scrollTop += el.getBoundingClientRect().top - container.getBoundingClientRect().top
        }
      }
      return
    }
    pendingAnchorRef.current = anchorId ?? null
    pendingScrollYRef.current = null
    setActiveSectionKey(sectionKey)
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

      const entry = { dirPath: state.dirPath, sectionKey: activeSectionKeyRef.current, scrollY: sectionScrollYRef.current }
      setNavBack((prev) => [...prev, entry])
      setNavForward([])

      const normalizedDir = state.dirPath.replace(/\/$/, '')

      if (info.isDir) {
        if (info.fullPath === normalizedDir) {
          if (state.fileNames.length > 0) navigateToSection(state.fileNames[0])
          return
        }
        pendingNavRef.current = { sectionKey: '__first__', scrollY: 0 }
        loadDir(info.fullPath)
      } else {
        const lastSlash = info.fullPath.lastIndexOf('/')
        const targetDir = info.fullPath.substring(0, lastSlash)
        const targetFile = info.fullPath.substring(lastSlash + 1)
        if (targetDir === normalizedDir) {
          if (!state.papers[targetFile] && !histories[targetFile]) {
            loadPaper(state.dirPath, targetFile)
          }
          navigateToSection(targetFile)
        } else {
          pendingNavRef.current = { sectionKey: targetFile, scrollY: 0 }
          loadDir(targetDir)
        }
      }
    },
    [state, histories, activeSectionKey]
  )

  const navigateBackFn = useCallback(() => {
    if (!state || navBack.length === 0) return
    const entry = navBack[navBack.length - 1]
    const current = { dirPath: state.dirPath, sectionKey: activeSectionKeyRef.current, scrollY: sectionScrollYRef.current }
    setNavBack((prev) => prev.slice(0, -1))
    setNavForward((prev) => [current, ...prev])
    if (entry.dirPath !== state.dirPath) {
      pendingNavRef.current = { sectionKey: entry.sectionKey, scrollY: entry.scrollY }
      loadDir(entry.dirPath)
    } else {
      pendingScrollYRef.current = entry.scrollY
      setActiveSectionKey(entry.sectionKey)
    }
  }, [navBack, state])

  const navigateForwardFn = useCallback(() => {
    if (!state || navForward.length === 0) return
    const entry = navForward[0]
    const current = { dirPath: state.dirPath, sectionKey: activeSectionKeyRef.current, scrollY: sectionScrollYRef.current }
    setNavForward((prev) => prev.slice(1))
    setNavBack((prev) => [...prev, current])
    if (entry.dirPath !== state.dirPath) {
      pendingNavRef.current = { sectionKey: entry.sectionKey, scrollY: entry.scrollY }
      loadDir(entry.dirPath)
    } else {
      pendingScrollYRef.current = entry.scrollY
      setActiveSectionKey(entry.sectionKey)
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

  useEffect(() => {
    activeSectionKeyRef.current = activeSectionKey
    const fn = state?.fileNames.includes(activeSectionKey) ? activeSectionKey : ''
    focusedPaperRef.current = fn
    setFocusedFileName(fn)
  }, [activeSectionKey, state])

  useEffect(() => {
    const container = sectionViewRef.current
    if (!container) return
    const anchor = pendingAnchorRef.current
    const scrollY = pendingScrollYRef.current
    pendingAnchorRef.current = null
    pendingScrollYRef.current = null
    if (anchor) {
      requestAnimationFrame(() => {
        const el = document.getElementById(anchor)
        if (el && sectionViewRef.current) {
          sectionViewRef.current.scrollTop += el.getBoundingClientRect().top - sectionViewRef.current.getBoundingClientRect().top
        }
      })
    } else {
      container.scrollTop = scrollY ?? 0
    }
  }, [activeSectionKey])

  useEffect(() => {
    const pending = pendingNavRef.current
    if (!state || !pending) return
    pendingNavRef.current = null
    const sectionKey = pending.sectionKey === '__first__'
      ? (state.fileNames[0] ?? '')
      : pending.sectionKey
    if (sectionKey && state.fileNames.includes(sectionKey) && !requestedRef.current.has(sectionKey)) {
      loadPaper(state.dirPath, sectionKey)
    }
    pendingScrollYRef.current = pending.scrollY
    setActiveSectionKey(sectionKey || (state.fileNames.length > 0 ? state.fileNames[0] : 'metadata'))
  }, [state?.dirPath])

  useEffect(() => {
    const anyDirty = Object.entries(histories).some(
      ([, h]) => h.present !== h.savedSnapshot
    )
    document.title = state?.dirPath
      ? `${anyDirty ? '• ' : ''}${state.dirPath} — Tables Editor`
      : 'Tables Editor'
  }, [state?.dirPath, histories])

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

  useEffect(() => {
    if (!state || !activeSectionKey) return
    if (!state.fileNames.includes(activeSectionKey)) return
    if (requestedRef.current.has(activeSectionKey)) return
    loadPaper(state.dirPath, activeSectionKey)
  }, [activeSectionKey, state?.dirPath])

  useEffect(() => {
    const container = sectionViewRef.current
    if (!state || !container) return
    const anchorIds = buildSectionAnchorIds(activeSectionKey, state, histories)
    setActiveId(anchorIds[0] ?? '')
    const handleScroll = () => {
      sectionScrollYRef.current = container.scrollTop
      const containerTop = container.getBoundingClientRect().top
      let active = anchorIds[0] ?? ''
      for (const id of anchorIds) {
        const el = document.getElementById(id)
        if (!el) continue
        if (el.getBoundingClientRect().top - containerTop <= 8) active = id
        else break
      }
      setActiveId(active)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [activeSectionKey, state, histories])

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

  const dirtyFileNames = new Set(
    Object.entries(histories)
      .filter(([, h]) => h.present !== h.savedSnapshot)
      .map(([name]) => name)
  )

  const focusedEntry = histories[focusedFileName]
  const canUndoFocused = (focusedEntry?.past.length ?? 0) > 0
  const focusedDirty = dirtyFileNames.has(focusedFileName)

  const activePaperIdx = state.fileNames.indexOf(activeSectionKey)
  const activePaperId = activePaperIdx !== -1 ? `paper-${activePaperIdx}` : ''
  const activeHistory = activeSectionKey ? histories[activeSectionKey] : undefined
  const activeContent = activeHistory?.present ?? (activeSectionKey ? state.papers[activeSectionKey] : null) ?? null
  const activeIsLoading = Boolean(activeSectionKey && loadingPapers[activeSectionKey])

  return (
    <>
      {findBarOpen && <FindBar onClose={closeFindBar} />}
      <Toc
        fileNames={state.fileNames}
        papers={state.papers}
        activeId={activeId}
        hasMetadata={hasMetadata}
        hasSources={(state.metadata.sources?.length ?? 0) > 0}
        dirtyFileNames={dirtyFileNames}
        collapsed={tocCollapsed}
        activeSectionKey={activeSectionKey}
        onToggleCollapse={() => setTocCollapsed((v) => !v)}
        onNavigateToSection={navigateToSection}
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
          <div className="section-view" ref={sectionViewRef}>
            {(activeSectionKey === 'metadata' || activeSectionKey === 'sources') && (
              <MetadataSection
                metadata={state.metadata}
                navigateToSource={callbacks.navigateToSource}
                uuidToFullPath={uuidToFullPath}
                section={activeSectionKey}
              />
            )}
            {activePaperIdx !== -1 && (() => {
              const fileName = activeSectionKey
              const history = histories[fileName]
              const content = activeContent
              const isLoading = activeIsLoading

              if (history?.present === null) return null

              if (!content) {
                return (
                  <div key={fileName} className="paper-placeholder">
                    <span className="spinner" aria-label="Loading" />
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
                    paperId={activePaperId}
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
            })()}
          </div>
        </main>
      </div>
    </>
  )
}
