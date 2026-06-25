import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight, FaFloppyDisk, FaRotateLeft } from 'react-icons/fa6'
import type {
  Curation,
  DirectoryState,
  EditHistories,
  Metadata,
  PaperHistory,
  PaperState,
  ResolvedSource,
  TablesFile
} from './types'
import { buildPaperAnchorIds, findTableAnchorId } from './tableUtils'
import * as actions from './editorActions'
import type { EditorCallbacks } from './editorCallbacks'
import { Toc } from './components/Toc'
import { MetadataSection } from './components/MetadataSection'
import { PaperSection } from './components/PaperSection'
import { SearchBar } from './components/SearchBar'
import type { SearchState } from './components/SearchBar'
import { NameModal } from './components/NameModal'
import { CurationModal } from './components/CurationModal'
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
  const [recentDirs, setRecentDirs] = useState<string[]>([])
  const [appLoading, setAppLoading] = useState(false)
  const [loadingPapers, setLoadingPapers] = useState<Record<string, boolean>>({})
  const [activeId, setActiveId] = useState('')
  const [histories, dispatchHistory] = useReducer(historyReducer, {})
  const [navBack, setNavBack] = useState<Array<{ dirPath: string; sectionKey: string; scrollY: number }>>([])
  const [navForward, setNavForward] = useState<Array<{ dirPath: string; sectionKey: string; scrollY: number }>>([])
  const [focusedFileName, setFocusedFileName] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ query: '', includeNavTitles: false, includeAllSections: false })
  const [tocCollapsed, setTocCollapsed] = useState(false)
  const [activeSectionKey, setActiveSectionKey] = useState<string>('')
  const [showEmptyRows, setShowEmptyRows] = useState(false)
  const [userName, setUserName] = useState('')
  const [pendingSave, setPendingSave] = useState<{ fileName: string; isAs: boolean } | null>(null)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameModalIsPresave, setNameModalIsPresave] = useState(false)
  const [showCurationModal, setShowCurationModal] = useState(false)
  const requestedRef = useRef(new Set<string>())
  const focusedPaperRef = useRef<string>('')
  const searchBarInputRef = useRef<HTMLInputElement>(null)
  const matchIndexRef = useRef(0)
  const pendingNavRef = useRef<{ sectionKey: string; scrollY: number } | null>(null)
  const sectionViewRef = useRef<HTMLDivElement>(null)
  const sectionScrollYRef = useRef<number>(0)
  const pendingAnchorRef = useRef<string | null>(null)
  const pendingSourceTableNumRef = useRef<number | null>(null)
  const pendingScrollYRef = useRef<number | null>(null)
  const activeSectionKeyRef = useRef<string>('')
  const initiateSaveRef = useRef<(fileName: string, isAs: boolean) => void>(() => {})

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

  async function openResultSet() {
    const path = await window.api.openDirectory()
    if (!path) return
    await loadDir(path)
  }

  async function openRecentResultSet(dirPath: string) {
    await window.api.markDirOpened(dirPath)
    await loadDir(dirPath)
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

  async function runDelete(fileName: string) {
    if (!state) return
    await window.api.deletePaper(state.dirPath, fileName)
    dispatchHistory({ type: 'MARK_SAVED', fileName })
    setState((prev) => {
      if (!prev) return prev
      return { ...prev, fileNames: prev.fileNames.filter((f) => f !== fileName) }
    })
  }

  function initiateSave(fileName: string, isAs: boolean) {
    const entry = histories[fileName]
    if (!entry) return
    if (entry.present === null) {
      runDelete(fileName)
      return
    }
    setPendingSave({ fileName, isAs })
    if (!userName) {
      setNameModalIsPresave(true)
      setShowNameModal(true)
    } else {
      setShowCurationModal(true)
    }
  }

  initiateSaveRef.current = initiateSave

  async function onNameConfirm(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    await window.api.setUserName(trimmed)
    setUserName(trimmed)
    setShowNameModal(false)
    if (nameModalIsPresave) setShowCurationModal(true)
  }

  function onNameCancel() {
    setShowNameModal(false)
    if (nameModalIsPresave) setPendingSave(null)
  }

  async function onCurationConfirm(description: string) {
    if (!pendingSave || !state) return
    const { fileName, isAs } = pendingSave
    const entry = histories[fileName]
    if (!entry?.present) return

    const curation: Curation = {
      name: userName,
      date: new Date().toISOString().slice(0, 10),
      description: description.trim()
    }
    const updated = actions.appendCuration(entry.present, curation)
    dispatchHistory({ type: 'APPLY', fileName, newState: updated })

    const contentStr = JSON.stringify(updated, null, 2)
    if (isAs) {
      const result = await window.api.savePaperAs(state.dirPath, fileName, contentStr)
      if (result.ok && result.filePath) {
        const newName = result.filePath.split('/').pop()!
        setState((prev) =>
          prev && !prev.fileNames.includes(newName)
            ? { ...prev, fileNames: [...prev.fileNames, newName] }
            : prev
        )
        dispatchHistory({ type: 'RESET', fileName: newName, fresh: updated })
      }
    } else {
      await window.api.savePaper(state.dirPath, fileName, contentStr)
      dispatchHistory({ type: 'MARK_SAVED', fileName })
    }

    setShowCurationModal(false)
    setPendingSave(null)
  }

  function onCurationCancel() {
    setShowCurationModal(false)
    setPendingSave(null)
  }

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
    (uuid: string, tableNumber?: number) => {
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
        if (tableNumber !== undefined) pendingSourceTableNumRef.current = tableNumber
        pendingNavRef.current = { sectionKey: activeSectionKeyRef.current, scrollY: 0 }
        loadDir(info.fullPath)
      } else {
        const lastSlash = info.fullPath.lastIndexOf('/')
        const targetDir = info.fullPath.substring(0, lastSlash)
        const targetFile = info.fullPath.substring(lastSlash + 1)
        if (targetDir === normalizedDir) {
          if (!state.papers[targetFile] && !histories[targetFile]) {
            loadPaper(state.dirPath, targetFile)
          }
          if (tableNumber !== undefined) {
            const content = histories[targetFile]?.present ?? state.papers[targetFile]
            const paperIdx = state.fileNames.indexOf(targetFile)
            const anchorId = content && paperIdx !== -1
              ? findTableAnchorId(content, `paper-${paperIdx}`, tableNumber) ?? undefined
              : undefined
            if (anchorId === undefined) pendingSourceTableNumRef.current = tableNumber
            navigateToSection(targetFile, anchorId)
          } else {
            navigateToSection(targetFile)
          }
        } else {
          if (tableNumber !== undefined) pendingSourceTableNumRef.current = tableNumber
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
      savePaper: (fileName) => initiateSaveRef.current(fileName, false),
      savePaperAs: (fileName) => initiateSaveRef.current(fileName, true),
      navigateToSource: navigateToSourceFn,
      reverseText: (fileName, tableIdx) =>
        applyEdit(fileName, (f) => actions.reverseText(f, tableIdx)),
      transposeTable: (fileName, tableIdx) =>
        applyEdit(fileName, (f) => actions.transposeTable(f, tableIdx)),
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
      mergeRow: (fileName, tableIdx, fragmentIdx, rowIdx, direction) =>
        applyEdit(fileName, (f) => actions.mergeRows(f, tableIdx, fragmentIdx, rowIdx, direction)),
      addRow: (fileName, tableIdx, fragmentIdx, afterRowIdx) =>
        applyEdit(fileName, (f) => actions.addRow(f, tableIdx, fragmentIdx, afterRowIdx)),
      deleteColumn: (fileName, tableIdx, colName) =>
        applyEdit(fileName, (f) => actions.deleteColumn(f, tableIdx, colName)),
      renameColumn: (fileName, tableIdx, oldName, newName) =>
        applyEdit(fileName, (f) => actions.renameColumn(f, tableIdx, oldName, newName)),
      mergeColumns: (fileName, tableIdx, keepCol, dropCol) =>
        applyEdit(fileName, (f) => actions.mergeColumns(f, tableIdx, keepCol, dropCol)),
      addColumn: (fileName, tableIdx, columnName, afterColName) =>
        applyEdit(fileName, (f) => actions.addColumn(f, tableIdx, columnName, afterColName)),
      editCell: (fileName, tableIdx, fragmentIdx, rowIdx, colName, newValue) =>
        applyEdit(fileName, (f) =>
          actions.editCell(f, tableIdx, fragmentIdx, rowIdx, colName, newValue)
        )
    }),
    [applyEdit, applyDelete, navigateToSourceFn]
  )

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    window.api.getRecentDirs().then(setRecentDirs)
    window.api.getUserName().then(setUserName)
  }, [])

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
    const tableNum = pendingSourceTableNumRef.current
    if (tableNum === null || !state || !activeSectionKey) return
    const content = histories[activeSectionKey]?.present ?? state.papers[activeSectionKey]
    if (!content) return
    pendingSourceTableNumRef.current = null
    const paperIdx = state.fileNames.indexOf(activeSectionKey)
    if (paperIdx === -1) return
    const anchorId = findTableAnchorId(content, `paper-${paperIdx}`, tableNum)
    if (!anchorId) return
    requestAnimationFrame(() => {
      const el = document.getElementById(anchorId)
      if (el && sectionViewRef.current) {
        sectionViewRef.current.scrollTop += el.getBoundingClientRect().top - sectionViewRef.current.getBoundingClientRect().top
      }
    })
  }, [activeSectionKey, state, histories[activeSectionKey]])

  useEffect(() => {
    const pending = pendingNavRef.current
    if (!state || !pending) return
    pendingNavRef.current = null
    const resolvedKey = state.fileNames.includes(pending.sectionKey)
      ? pending.sectionKey
      : (state.fileNames[0] ?? '')
    if (pending.sectionKey !== '__first__' && resolvedKey !== pending.sectionKey) {
      pendingSourceTableNumRef.current = null
    }
    if (resolvedKey && state.fileNames.includes(resolvedKey) && !requestedRef.current.has(resolvedKey)) {
      loadPaper(state.dirPath, resolvedKey)
    }
    pendingScrollYRef.current = pending.scrollY
    setActiveSectionKey(resolvedKey || (state.fileNames.length > 0 ? state.fileNames[0] : 'metadata'))
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
      if (name) initiateSaveRef.current(name, false)
    })
    const u2 = window.api.onSaveCurrentPaperAs(() => {
      const name = focusedPaperRef.current
      if (name) initiateSaveRef.current(name, true)
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
    return () => { u1(); u2(); u3(); u4(); u5(); u6() }
  }, [navigateBackFn, navigateForwardFn])

  useEffect(() => {
    return window.api.onFocusSearchBar(() => {
      searchBarInputRef.current?.focus()
    })
  }, [])

  useEffect(() => {
    return window.api.onSetShowEmptyRows((show) => setShowEmptyRows(show))
  }, [])

  useEffect(() => {
    return window.api.onEditUserName(() => {
      setNameModalIsPresave(false)
      setShowNameModal(true)
    })
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

  // ── search navigation ────────────────────────────────────────────────────

  const navigateMatch = useCallback((direction: 'forward' | 'backward') => {
    const marks = Array.from(document.querySelectorAll<HTMLElement>('.search-highlight'))
    if (marks.length === 0) return
    const current = matchIndexRef.current
    const next = direction === 'forward'
      ? (current + 1) % marks.length
      : (current - 1 + marks.length) % marks.length
    document.querySelectorAll<HTMLElement>('.search-highlight-active')
      .forEach((el) => el.classList.remove('search-highlight-active'))
    marks[next].classList.add('search-highlight-active')
    marks[next].scrollIntoView({ block: 'center', behavior: 'smooth' })
    matchIndexRef.current = next
  }, [])

  useEffect(() => {
    matchIndexRef.current = 0
    document.querySelectorAll<HTMLElement>('.search-highlight-active')
      .forEach((el) => el.classList.remove('search-highlight-active'))
  }, [searchState.query])

  useEffect(() => {
    if (!searchState.query) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const active = document.activeElement
      const isEditingOtherField =
        active !== null &&
        active !== searchBarInputRef.current &&
        (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')
      if (!isEditingOtherField) {
        e.preventDefault()
        navigateMatch(e.shiftKey ? 'backward' : 'forward')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchState.query, navigateMatch])

  // ── render ────────────────────────────────────────────────────────────────

  if (!state) {
    return (
      <>
        <div className="open-dir-screen">
          <h1>Tables Editor</h1>
          {appLoading ? (
            <span className="spinner" aria-label="Loading" />
          ) : (
            <>
              {recentDirs.length > 0 && (
                <div className="recent-dirs">
                  {recentDirs.map((dirPath) => (
                    <button
                      key={dirPath}
                      className="recent-dir-btn"
                      title={dirPath}
                      onClick={() => openRecentResultSet(dirPath)}
                    >
                      {dirPath.split('/').pop() || dirPath}
                    </button>
                  ))}
                </div>
              )}
              <button className="open-dir-btn" onClick={openResultSet}>
                Open ResultSet
              </button>
            </>
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

  const tocPapers: Record<string, TablesFile> = {}
  for (const fileName of state.fileNames) {
    const content = histories[fileName]?.present ?? state.papers[fileName]
    if (content) tocPapers[fileName] = content
  }

  const searchQuery = searchState.query
  const tocSearchQuery = searchState.includeNavTitles ? searchQuery : ''

  return (
    <>
      <Toc
        fileNames={state.fileNames}
        papers={tocPapers}
        activeId={activeId}
        hasMetadata={hasMetadata}
        hasSources={(state.metadata.sources?.length ?? 0) > 0}
        dirtyFileNames={dirtyFileNames}
        collapsed={tocCollapsed}
        activeSectionKey={activeSectionKey}
        searchQuery={tocSearchQuery}
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
        <SearchBar searchState={searchState} onChange={setSearchState} inputRef={searchBarInputRef} />
        <main>
          {appLoading && (
            <div className="loading-overlay">
              <span className="spinner" aria-label="Loading" />
            </div>
          )}
          <div className="section-view" ref={sectionViewRef}>
            {searchState.includeAllSections ? (
              <>
                {hasMetadata && (
                  <MetadataSection
                    metadata={state.metadata}
                    navigateToSource={callbacks.navigateToSource}
                    uuidToFullPath={uuidToFullPath}
                    section="metadata"
                    searchQuery={searchQuery}
                  />
                )}
                {(state.metadata.sources?.length ?? 0) > 0 && (
                  <MetadataSection
                    metadata={state.metadata}
                    navigateToSource={callbacks.navigateToSource}
                    uuidToFullPath={uuidToFullPath}
                    section="sources"
                    searchQuery={searchQuery}
                  />
                )}
                {state.fileNames.map((fileName, fileIdx) => {
                  const history = histories[fileName]
                  const content = history?.present ?? state.papers[fileName]
                  if (!content || history?.present === null) return null
                  const paperId = `paper-${fileIdx}`
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
                        searchQuery={searchQuery}
                        showEmptyRows={showEmptyRows}
                      />
                    </div>
                  )
                })}
              </>
            ) : (
              <>
                {(activeSectionKey === 'metadata' || activeSectionKey === 'sources') && (
                  <MetadataSection
                    metadata={state.metadata}
                    navigateToSource={callbacks.navigateToSource}
                    uuidToFullPath={uuidToFullPath}
                    section={activeSectionKey}
                    searchQuery={searchQuery}
                  />
                )}
                {activePaperIdx !== -1 && (() => {
                  const fileName = activeSectionKey
                  const history = histories[fileName]
                  const content = activeContent

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
                        searchQuery={searchQuery}
                        showEmptyRows={showEmptyRows}
                      />
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        </main>
      </div>
      {showNameModal && (
        <NameModal
          initialDraft={userName}
          onConfirm={onNameConfirm}
          onCancel={onNameCancel}
        />
      )}
      {showCurationModal && (
        <CurationModal
          onConfirm={onCurationConfirm}
          onCancel={onCurationCancel}
        />
      )}
    </>
  )
}
