import { describe, it, expect } from 'vitest'
import {
  appendCuration,
  compactFragments,
  deleteColumn,
  deleteFragment,
  deleteRow,
  deleteTable,
  editCell,
  mergeColumns,
  mergeWithNextTable,
  promoteRowToHeader,
  renameColumn,
} from '../editorActions'
import type { Curation, Row, TablesFile } from '../types'

// ── fixtures ─────────────────────────────────────────────────────────────────

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

function fragmentedTable(...groups: Row[][]): TablesFile['tables'][number] {
  return {
    table_fragments: groups.map((rows, i) => ({ rows, page: i + 1 })),
  }
}

// ── appendCuration ────────────────────────────────────────────────────────────

describe('appendCuration', () => {
  const curation: Curation = { curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' }

  it('adds the curation to metadata.curations when no curations exist yet', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin' }]))
    const result = appendCuration(file, curation)
    expect(result.metadata).toEqual({
      curations: [{ curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' }],
    })
  })

  it('appends to an existing curations array, preserving earlier entries', () => {
    const earlier: Curation = { curator: 'Bob', timestamp: '2024-01-01', description: 'initial' }
    const file: TablesFile = { tables: [], metadata: { curations: [earlier] } }
    const result = appendCuration(file, curation)
    expect(result.metadata?.['curations']).toEqual([
      { curator: 'Bob', timestamp: '2024-01-01', description: 'initial' },
      { curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' },
    ])
  })

  it('preserves other metadata fields alongside curations', () => {
    const file: TablesFile = {
      tables: [],
      metadata: { reader: 'tablemerge', agreement_method: 'simple-count' },
    }
    const result = appendCuration(file, curation)
    expect(result.metadata?.reader).toBe('tablemerge')
    expect(result.metadata?.agreement_method).toBe('simple-count')
    expect(Array.isArray(result.metadata?.['curations'])).toBe(true)
  })

  it('creates a metadata object when the file has none', () => {
    const file = makeFile(flatTable([]))
    const result = appendCuration(file, { curator: 'Alice', timestamp: '2024-06-25', description: '' })
    expect(result.metadata).toEqual({
      curations: [{ curator: 'Alice', timestamp: '2024-06-25', description: '' }],
    })
  })

  it('does not mutate the original file metadata', () => {
    const file: TablesFile = { tables: [], metadata: {} }
    appendCuration(file, curation)
    expect(file.metadata).toEqual({})
  })

  it('does not mutate the original curations array', () => {
    const originalCurations: Curation[] = [{ curator: 'Bob', timestamp: '2024-01-01', description: 'old' }]
    const file: TablesFile = { tables: [], metadata: { curations: originalCurations } }
    appendCuration(file, curation)
    expect(originalCurations).toHaveLength(1)
  })

  it('accepts an empty description', () => {
    const file = makeFile(flatTable([]))
    const result = appendCuration(file, { curator: 'Alice', timestamp: '2024-06-25', description: '' })
    const curations = result.metadata?.['curations'] as Curation[]
    expect(curations[0].description).toBe('')
  })
})

// ── deleteTable ───────────────────────────────────────────────────────────────

describe('deleteTable', () => {
  it('removes the table at the given index', () => {
    const file = makeFile(flatTable([{ name: 'A' }]), flatTable([{ name: 'B' }]))
    expect(deleteTable(file, 0).tables).toEqual([flatTable([{ name: 'B' }])])
  })

  it('does not mutate the original file', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    deleteTable(file, 0)
    expect(file.tables).toHaveLength(1)
  })

  it('returns an empty tables array when the only table is deleted', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    expect(deleteTable(file, 0).tables).toEqual([])
  })
})

// ── deleteFragment ────────────────────────────────────────────────────────────

describe('deleteFragment', () => {
  it('removes a fragment from a multi-fragment table, preserving original page numbers', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }], [{ name: 'C' }])
    )
    const result = deleteFragment(file, 0, 1)
    // Fragments 0 (page 1) and 2 (page 3) remain; page numbers are not renumbered.
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'C' }], page: 3 },
      ],
    })
  })

  it('removes the whole table when the last fragment is deleted', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }]),
      flatTable([{ name: 'B' }])
    )
    const result = deleteFragment(file, 0, 0)
    expect(result.tables).toEqual([flatTable([{ name: 'B' }])])
  })

  it('keeps table_fragments shape when exactly one fragment remains', () => {
    const file = makeFile(fragmentedTable([{ name: 'A' }], [{ name: 'B' }]))
    const result = deleteFragment(file, 0, 0)
    expect(result.tables[0]).toEqual({
      table_fragments: [{ rows: [{ name: 'B' }], page: 2 }],
    })
  })
})

// ── compactFragments ──────────────────────────────────────────────────────────

describe('compactFragments', () => {
  it('merges all fragment rows into a single flat table', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }], [{ name: 'C' }])
    )
    const result = compactFragments(file, 0)
    expect(result.tables[0]).toEqual({
      rows: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
      page: 1,
    })
  })

  it('keeps the page number of the first fragment', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }])
    )
    expect((compactFragments(file, 0).tables[0] as { page: number }).page).toBe(1)
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ drug: 'X' }], 5)
    const file = makeFile(fragmentedTable([{ name: 'A' }], [{ name: 'B' }]), other)
    const result = compactFragments(file, 0)
    expect(result.tables[1]).toBe(other)
  })

  it('applied to a flat table returns an equivalent flat table', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }], 7))
    const result = compactFragments(file, 0)
    expect(result.tables[0]).toEqual({ rows: [{ name: 'A' }, { name: 'B' }], page: 7 })
  })
})

// ── mergeWithNextTable ────────────────────────────────────────────────────────

describe('mergeWithNextTable', () => {
  it('combines the current table and the next into one fragmented table at the next position', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      flatTable([{ name: 'B' }], 2)
    )
    const result = mergeWithNextTable(file, 0)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
      ],
    })
  })

  it('is a no-op when tableIdx is the last table', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    expect(mergeWithNextTable(file, 0)).toBe(file)
  })

  it('merges all fragments of a multi-fragment table with the next flat table', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }]),
      flatTable([{ name: 'C' }], 3)
    )
    const result = mergeWithNextTable(file, 0)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 },
      ],
    })
  })
})

// ── deleteRow ─────────────────────────────────────────────────────────────────

describe('deleteRow', () => {
  it('removes the specified row from the specified fragment', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }, { name: 'C' }]))
    const result = deleteRow(file, 0, 0, 1)
    expect(result.tables[0]).toEqual(flatTable([{ name: 'A' }, { name: 'C' }]))
  })

  it('only removes from the targeted fragment, leaving others intact', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }, { name: 'B' }], [{ name: 'C' }])
    )
    const result = deleteRow(file, 0, 0, 0)
    const frags = (result.tables[0] as { table_fragments: unknown[] }).table_fragments
    expect(frags[0]).toEqual({ rows: [{ name: 'B' }], page: 1 })
    expect(frags[1]).toEqual({ rows: [{ name: 'C' }], page: 2 })
  })
})

// ── promoteRowToHeader ────────────────────────────────────────────────────────

describe('promoteRowToHeader', () => {
  it('renames column keys using the promoted row values', () => {
    const file = makeFile(
      flatTable([
        { col1: 'Drug name', col2: 'Dose' },
        { col1: 'aspirin', col2: '500mg' },
        { col1: 'ibuprofen', col2: '200mg' },
      ])
    )
    const result = promoteRowToHeader(file, 0, 0, 0)
    expect(result.tables[0]).toEqual(
      flatTable([
        { 'Drug name': 'aspirin', Dose: '500mg' },
        { 'Drug name': 'ibuprofen', Dose: '200mg' },
      ])
    )
  })

  it('removes the promoted row itself', () => {
    const file = makeFile(flatTable([{ col1: 'Name' }, { col1: 'aspirin' }]))
    const result = promoteRowToHeader(file, 0, 0, 0)
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows).toHaveLength(1)
  })

  it('falls back to the original column name when the promoted value is empty', () => {
    const file = makeFile(flatTable([{ col1: '', col2: 'Dose' }, { col1: 'A', col2: '5mg' }]))
    const result = promoteRowToHeader(file, 0, 0, 0)
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows[0]).toEqual({ col1: 'A', Dose: '5mg' })
  })

  it('renames columns across all fragments of the table', () => {
    const file = makeFile(
      fragmentedTable(
        [{ col1: 'Drug', col2: 'Dose' }, { col1: 'aspirin', col2: '500mg' }],
        [{ col1: 'ibuprofen', col2: '200mg' }]
      )
    )
    const result = promoteRowToHeader(file, 0, 0, 0)
    const frags = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(frags[0].rows).toEqual([{ Drug: 'aspirin', Dose: '500mg' }])
    expect(frags[1].rows).toEqual([{ Drug: 'ibuprofen', Dose: '200mg' }])
  })
})

// ── deleteColumn ──────────────────────────────────────────────────────────────

describe('deleteColumn', () => {
  it('removes the named column from every row', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = deleteColumn(file, 0, 'dose')
    expect(result.tables[0]).toEqual(
      flatTable([{ name: 'aspirin' }, { name: 'ibuprofen' }])
    )
  })

  it('removes the column from all fragments', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', dose: '5mg' }],
        [{ name: 'B', dose: '10mg' }]
      )
    )
    const result = deleteColumn(file, 0, 'dose')
    const frags = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(frags[0].rows[0]).toEqual({ name: 'A' })
    expect(frags[1].rows[0]).toEqual({ name: 'B' })
  })
})

// ── renameColumn ──────────────────────────────────────────────────────────────

describe('renameColumn', () => {
  it('renames the column key in all rows', () => {
    const file = makeFile(
      flatTable([
        { drug: 'aspirin', dose: '500mg' },
        { drug: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = renameColumn(file, 0, 'drug', 'medication')
    expect(result.tables[0]).toEqual(
      flatTable([
        { medication: 'aspirin', dose: '500mg' },
        { medication: 'ibuprofen', dose: '200mg' },
      ])
    )
  })

  it('avoids collision by appending _2, _3 etc.', () => {
    const file = makeFile(
      flatTable([{ col1: 'A', col2: 'B', col3: 'C' }])
    )
    // renaming col1 → col2 would collide; should become col2_2
    const result = renameColumn(file, 0, 'col1', 'col2')
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(row).toEqual({ col2_2: 'A', col2: 'B', col3: 'C' })
  })

  it('increments suffix beyond _2 when _2 is also taken', () => {
    const file = makeFile(
      flatTable([{ col1: 'A', col2: 'B', col2_2: 'C' }])
    )
    const result = renameColumn(file, 0, 'col1', 'col2')
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(row).toEqual({ col2_3: 'A', col2: 'B', col2_2: 'C' })
  })

  it('renames across all fragments', () => {
    const file = makeFile(
      fragmentedTable([{ drug: 'A' }], [{ drug: 'B' }])
    )
    const result = renameColumn(file, 0, 'drug', 'medication')
    const frags = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(frags[0].rows[0]).toEqual({ medication: 'A' })
    expect(frags[1].rows[0]).toEqual({ medication: 'B' })
  })
})

// ── mergeColumns ──────────────────────────────────────────────────────────────

describe('mergeColumns', () => {
  it('concatenates keep and drop column values with a space', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', suffix: '(tablet)' }])
    )
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin (tablet)',
    })
  })

  it('drops the drop column from the row', () => {
    const file = makeFile(flatTable([{ name: 'A', suffix: 'B' }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect('suffix' in (result.tables[0] as { rows: Row[] }).rows[0]).toBe(false)
  })

  it('omits an empty keep value from the concatenation', () => {
    const file = makeFile(flatTable([{ name: '', suffix: '(tablet)' }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: '(tablet)',
    })
  })

  it('omits an empty drop value from the concatenation', () => {
    const file = makeFile(flatTable([{ name: 'aspirin', suffix: null }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin',
    })
  })

  it('preserves other columns unchanged', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', suffix: '500mg', group: 'NSAID' }])
    )
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin 500mg',
      group: 'NSAID',
    })
  })
})

// ── editCell ──────────────────────────────────────────────────────────────────

describe('editCell', () => {
  it('updates the value of the specified cell', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }, { name: 'ibuprofen', dose: '200mg' }])
    )
    const result = editCell(file, 0, 0, 0, 'dose', '1000mg')
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows[0]).toEqual({ name: 'aspirin', dose: '1000mg' })
    expect(rows[1]).toEqual({ name: 'ibuprofen', dose: '200mg' })
  })

  it('stores the new value as a plain string, replacing any previous type', () => {
    const file = makeFile(
      flatTable([{ name: [{ value: 'aspirin', agreement_level: 3 }] }])
    )
    const result = editCell(file, 0, 0, 0, 'name', 'ASA')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: 'ASA' })
  })

  it('only modifies the targeted fragment, leaving others unchanged', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A' }],
        [{ name: 'B' }]
      )
    )
    const result = editCell(file, 0, 0, 0, 'name', 'X')
    const frags = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(frags[0].rows[0]).toEqual({ name: 'X' })
    expect(frags[1].rows[0]).toEqual({ name: 'B' })
  })
})
