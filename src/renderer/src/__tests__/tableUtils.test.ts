import { describe, it, expect } from 'vitest'
import {
  agreementClass,
  buildFragmentColumns,
  buildPaperAnchorIds,
  collectPaperSourceUuids,
  columnNames,
  computeRowspans,
  flattenMetadataRows,
  getRowColumns,
  isEmptyRow,
  readerEmoji,
  renderCitation,
  renderColumnValue,
  renderDataCell,
  rowPaletteClass,
} from '../utils/table'
import type { Row, Table, TableWithFragments, TableWithRows } from '../types'
import { getTableFragments } from '../utils/getTableFragments'

// ── getTableFragments ────────────────────────────────────────────────────────

describe('getTableFragments', () => {
  it('wraps a TableWithRows in a single-element array', () => {
    const table: TableWithRows = { rows: [{ name: 'A' }], page: 3 }
    expect(getTableFragments(table)).toEqual([{ rows: [{ name: 'A' }], page: 3 }])
  })

  it('returns the fragments array of a TableWithFragments unchanged', () => {
    const table: TableWithFragments = {
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
      ],
    }
    expect(getTableFragments(table)).toEqual([
      { rows: [{ name: 'A' }], page: 1 },
      { rows: [{ name: 'B' }], page: 2 },
    ])
  })
})

// ── getRowColumns ────────────────────────────────────────────────────────────

describe('getRowColumns', () => {
  it('strips agreement_level_ and sources_ from the result', () => {
    const row: Row = {
      agreement_level_: 3,
      sources_: ['uuid-1'],
      name: 'aspirin',
      dose: '500mg',
    }
    expect(getRowColumns(row)).toEqual({ name: 'aspirin', dose: '500mg' })
  })

  it('returns an empty object for a row with only meta columns', () => {
    const row: Row = { agreement_level_: 1, sources_: [] }
    expect(getRowColumns(row)).toEqual({})
  })
})

// ── columnNames ──────────────────────────────────────────────────────────────

describe('columnNames', () => {
  it('collects ordered unique keys, skipping meta columns', () => {
    const rows: Row[] = [
      { agreement_level_: 1, name: 'A', dose: '5mg' },
      { name: 'B', dose: '10mg', unit: 'mg' },
    ]
    expect(columnNames(rows)).toEqual(['name', 'dose', 'unit'])
  })

  it('deduplicates column names across rows', () => {
    const rows: Row[] = [{ color: 'red', size: 'L' }, { color: 'blue', size: 'M' }]
    expect(columnNames(rows)).toEqual(['color', 'size'])
  })

  it('returns [] for an empty row list', () => {
    expect(columnNames([])).toEqual([])
  })
})

// ── isEmptyRow ───────────────────────────────────────────────────────────────

describe('isEmptyRow', () => {
  it('returns true when all data values are null or empty string', () => {
    const row: Row = { agreement_level_: 2, name: null, dose: '' }
    expect(isEmptyRow(row)).toBe(true)
  })

  it('returns false when any data column has a non-empty value', () => {
    const row: Row = { name: '', dose: '5mg' }
    expect(isEmptyRow(row)).toBe(false)
  })

  it('returns true for a row that is entirely meta columns', () => {
    const row: Row = { agreement_level_: 1, sources_: ['x'] }
    expect(isEmptyRow(row)).toBe(true)
  })

  it('returns false when a ValueWithAgreement array has a non-empty value', () => {
    const row: Row = { name: [{ value: 'aspirin', agreement_level: 2 }] }
    expect(isEmptyRow(row)).toBe(false)
  })

  it('returns true when ValueWithAgreement array has only empty values', () => {
    const row: Row = { name: [{ value: '', agreement_level: 1 }] }
    expect(isEmptyRow(row)).toBe(true)
  })
})

// ── renderColumnValue ────────────────────────────────────────────────────────

describe('renderColumnValue', () => {
  it('returns empty string for null', () => {
    expect(renderColumnValue(null)).toBe('')
  })

  it('returns string representation of a number', () => {
    expect(renderColumnValue(42)).toBe('42')
  })

  it('returns a plain string unchanged', () => {
    expect(renderColumnValue('aspirin')).toBe('aspirin')
  })

  it('joins ValueWithAgreement array values with ", "', () => {
    const val = [
      { value: 'aspirin', agreement_level: 3 },
      { value: 'ibuprofen', agreement_level: 1 },
    ]
    expect(renderColumnValue(val)).toBe('aspirin, ibuprofen')
  })

  it('ignores agreement_level and uses value field only', () => {
    const val = [{ value: 'paracetamol', agreement_level: 2 }]
    expect(renderColumnValue(val)).toBe('paracetamol')
  })
})

// ── renderCitation ───────────────────────────────────────────────────────────

describe('renderCitation', () => {
  it('returns empty string for null', () => {
    expect(renderCitation(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(renderCitation(undefined)).toBe('')
  })

  it('returns plain string citation unchanged', () => {
    expect(renderCitation('Smith et al. 2020')).toBe('Smith et al. 2020')
  })

  it('joins citation array values with ", "', () => {
    const citation = [
      { value: 'Smith 2020', agreement_level: 3 },
      { value: 'Jones 2021', agreement_level: 2 },
    ]
    expect(renderCitation(citation)).toBe('Smith 2020, Jones 2021')
  })
})

// ── agreementClass ───────────────────────────────────────────────────────────

describe('agreementClass', () => {
  it('returns "low" for null', () => {
    expect(agreementClass(null)).toBe('low')
  })

  it('returns "low" for undefined', () => {
    expect(agreementClass(undefined)).toBe('low')
  })

  it('returns "low" for level 1', () => {
    expect(agreementClass(1)).toBe('low')
  })

  it('returns "medium" for level 2', () => {
    expect(agreementClass(2)).toBe('medium')
  })

  it('returns "high" for level 3', () => {
    expect(agreementClass(3)).toBe('high')
  })

  it('returns "high" for any level above 2', () => {
    expect(agreementClass(10)).toBe('high')
  })
})

// ── readerEmoji ──────────────────────────────────────────────────────────────

describe('readerEmoji', () => {
  it('returns empty string for undefined', () => {
    expect(readerEmoji(undefined)).toBe('')
  })

  it('returns 💻 for pdfplumber', () => {
    expect(readerEmoji('pdfplumber')).toBe('💻')
  })

  it('returns 💻 for camelot', () => {
    expect(readerEmoji('camelot')).toBe('💻')
  })

  it('returns 💻 for pymupdf', () => {
    expect(readerEmoji('pymupdf')).toBe('💻')
  })

  it('returns ☯️ for hybrid- prefix readers', () => {
    expect(readerEmoji('hybrid-pdfplumber')).toBe('☯️')
  })

  it('returns 🤖 for unknown readers like agent', () => {
    expect(readerEmoji('agent')).toBe('🤖')
  })
})

// ── flattenMetadataRows ──────────────────────────────────────────────────────

describe('flattenMetadataRows', () => {
  it('skips the sources key', () => {
    const metadata = { reader: 'pdfplumber', sources: [{ uuid: 'x' }] }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([['reader', 'pdfplumber']])
  })

  it('flattens nested objects with dot notation', () => {
    const metadata = { settings: { threshold: 0.5, lang: 'es' } }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([
      ['threshold', '0.5'],
      ['lang', 'es'],
    ])
  })

  it('joins array values with ", "', () => {
    const metadata = { tags: ['a', 'b', 'c'] }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([['tags', 'a, b, c']])
  })

  it('handles top-level scalar values', () => {
    const metadata = { reader: 'tablemerge', agreement_method: 'simple-count' }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([
      ['reader', 'tablemerge'],
      ['agreement_method', 'simple-count'],
    ])
  })

  it('returns an empty array for an empty metadata object', () => {
    expect(flattenMetadataRows({})).toEqual([])
  })
})

// ── collectPaperSourceUuids ──────────────────────────────────────────────────

describe('collectPaperSourceUuids', () => {
  it('collects all sources_ UUIDs across all tables and fragments', () => {
    const content = {
      tables: [
        {
          rows: [
            { name: 'A', sources_: ['uuid-1', 'uuid-2'] },
            { name: 'B', sources_: ['uuid-2'] },
          ],
          page: 1,
        },
        {
          table_fragments: [
            { rows: [{ name: 'C', sources_: ['uuid-3'] }], page: 2 },
          ],
        },
      ],
    }
    const uuids = collectPaperSourceUuids(content)
    expect(uuids).toEqual(new Set(['uuid-1', 'uuid-2', 'uuid-3']))
  })

  it('returns an empty set when no rows have sources_', () => {
    const content = { tables: [{ rows: [{ name: 'A' }], page: 1 }] }
    expect(collectPaperSourceUuids(content)).toEqual(new Set())
  })
})

// ── buildPaperAnchorIds ──────────────────────────────────────────────────────

describe('buildPaperAnchorIds', () => {
  it('returns only the paper anchor when there are no tables', () => {
    expect(buildPaperAnchorIds('paper-0', [])).toEqual(['paper-0'])
  })

  it('produces page anchors for single-fragment tables (no table-level anchor inserted)', () => {
    const tables: Table[] = [
      { rows: [{ name: 'A' }], page: 3 },
      { rows: [{ name: 'B' }], page: 7 },
    ]
    expect(buildPaperAnchorIds('paper-0', tables)).toEqual([
      'paper-0',
      'paper-0-table-1-page-3',
      'paper-0-table-2-page-7',
    ])
  })

  it('inserts a table-level anchor before the fragment page anchors for multi-fragment tables', () => {
    const tables: Table[] = [
      {
        table_fragments: [
          { rows: [{ name: 'A' }], page: 1 },
          { rows: [{ name: 'B' }], page: 2 },
        ],
      },
    ]
    expect(buildPaperAnchorIds('paper-1', tables)).toEqual([
      'paper-1',
      'paper-1-table-1',
      'paper-1-table-1-fragment-0-page-1',
      'paper-1-table-1-fragment-1-page-2',
    ])
  })

  it('handles a mix of single-fragment and multi-fragment tables', () => {
    const tables: Table[] = [
      { rows: [{ name: 'A' }], page: 5 },
      {
        table_fragments: [
          { rows: [{ name: 'B' }], page: 10 },
          { rows: [{ name: 'C' }], page: 11 },
        ],
      },
    ]
    expect(buildPaperAnchorIds('paper-0', tables)).toEqual([
      'paper-0',
      'paper-0-table-1-page-5',
      'paper-0-table-2',
      'paper-0-table-2-fragment-0-page-10',
      'paper-0-table-2-fragment-1-page-11',
    ])
  })
})

// ── rowPaletteClass ──────────────────────────────────────────────────────────

describe('rowPaletteClass', () => {
  it('returns "row-0" for row_ = 0', () => {
    expect(rowPaletteClass({ row_: 0 })).toBe('row-0')
  })

  it('returns "row-4" for row_ = 4', () => {
    expect(rowPaletteClass({ row_: 4 })).toBe('row-4')
  })

  it('wraps around at palette size 5: row_ = 5 gives "row-0"', () => {
    expect(rowPaletteClass({ row_: 5 })).toBe('row-0')
  })

  it('wraps correctly for row_ = 7 giving "row-2"', () => {
    expect(rowPaletteClass({ row_: 7 })).toBe('row-2')
  })

  it('returns undefined when row_ is absent', () => {
    expect(rowPaletteClass({ name: 'aspirin' })).toBeUndefined()
  })

  it('returns undefined when row_ is null', () => {
    expect(rowPaletteClass({ row_: null })).toBeUndefined()
  })

  it('returns undefined when row_ is a string', () => {
    expect(rowPaletteClass({ row_: 'header' })).toBeUndefined()
  })
})

// ── buildFragmentColumns ─────────────────────────────────────────────────────

describe('buildFragmentColumns', () => {
  it('puts row_ first, then agreement_level_, then data cols, then readers_/sources_ last', () => {
    const rows: Row[] = [
      { row_: 0, agreement_level_: 2, sources_: ['u1'], name: 'A', dose: '5mg' },
      { row_: 1, agreement_level_: 1, sources_: ['u2'], name: 'B', dose: '10mg' },
    ]
    const cols = buildFragmentColumns(rows)
    expect(cols).toEqual(['row_', 'agreement_level_', 'name', 'dose', 'readers_', 'sources_'])
  })

  it('puts agreement_level_ first when row_ is absent', () => {
    const rows: Row[] = [
      { agreement_level_: 2, sources_: ['u1'], name: 'A', dose: '5mg' },
      { agreement_level_: 1, sources_: ['u2'], name: 'B', dose: '10mg' },
    ]
    const cols = buildFragmentColumns(rows)
    expect(cols).toEqual(['agreement_level_', 'name', 'dose', 'readers_', 'sources_'])
  })

  it('omits agreement_level_ column when none of the rows have it', () => {
    const rows: Row[] = [{ name: 'A' }, { name: 'B' }]
    const cols = buildFragmentColumns(rows)
    expect(cols).toEqual(['name'])
  })

  it('adds readers_ and sources_ when sources_ is present but no agreement_level_', () => {
    const rows: Row[] = [{ sources_: ['u1'], name: 'A' }]
    const cols = buildFragmentColumns(rows)
    expect(cols).toEqual(['name', 'readers_', 'sources_'])
  })

  it('places columns not present in every row after the common columns', () => {
    const rows: Row[] = [
      { name: 'A', dose: '5mg' },
      { name: 'B' },
    ]
    const cols = buildFragmentColumns(rows)
    expect(cols).toEqual(['name', 'dose'])
  })

  it('returns an empty array for an empty row list', () => {
    expect(buildFragmentColumns([])).toEqual([])
  })
})

// ── computeRowspans ──────────────────────────────────────────────────────────

describe('computeRowspans', () => {
  const noReaders = new Map<string, string>()

  it('returns rowspan 1 for all cells when rows have no row_ values', () => {
    const rows: Row[] = [{ family: 'Apiaceae' }, { family: 'Apiaceae' }]
    expect(computeRowspans(rows, ['family'], noReaders)).toEqual([{ family: 1 }, { family: 1 }])
  })

  it('returns rowspan 1 when consecutive rows have different row_ values', () => {
    const rows: Row[] = [
      { family: 'Apiaceae', row_: 0 },
      { family: 'Apiaceae', row_: 1 },
    ]
    expect(computeRowspans(rows, ['family'], noReaders)).toEqual([{ family: 1 }, { family: 1 }])
  })

  it('merges consecutive rows with same row_ and same value', () => {
    const rows: Row[] = [
      { family: 'Apiaceae', row_: 0 },
      { family: 'Apiaceae', row_: 0 },
    ]
    expect(computeRowspans(rows, ['family'], noReaders)).toEqual([{ family: 2 }, { family: 0 }])
  })

  it('merges per-column independently when values differ across columns', () => {
    const rows: Row[] = [
      { family: 'Apiaceae', species: 'Ammi majus', row_: 0 },
      { family: 'Apiaceae', species: 'Carum carvi', row_: 0 },
    ]
    expect(computeRowspans(rows, ['family', 'species'], noReaders)).toEqual([
      { family: 2, species: 1 },
      { family: 0, species: 1 },
    ])
  })

  it('merges three consecutive rows with the same row_ and same value', () => {
    const rows: Row[] = [
      { family: 'Apiaceae', row_: 0 },
      { family: 'Apiaceae', row_: 0 },
      { family: 'Apiaceae', row_: 0 },
    ]
    expect(computeRowspans(rows, ['family'], noReaders)).toEqual([
      { family: 3 },
      { family: 0 },
      { family: 0 },
    ])
  })

  it('never merges the agreement_level_ column', () => {
    const rows: Row[] = [
      { family: 'Apiaceae', agreement_level_: 2, row_: 0 },
      { family: 'Apiaceae', agreement_level_: 2, row_: 0 },
    ]
    expect(computeRowspans(rows, ['agreement_level_', 'family'], noReaders)).toEqual([
      { agreement_level_: 1, family: 2 },
      { agreement_level_: 1, family: 0 },
    ])
  })
})

// ── renderDataCell ───────────────────────────────────────────────────────────

describe('renderDataCell', () => {
  const uuidToReader = new Map([
    ['uuid-1', 'pdfplumber'],
    ['uuid-2', 'camelot'],
  ])

  it('renders agreement_level_ as a string', () => {
    const row: Row = { agreement_level_: 3, name: 'A' }
    expect(renderDataCell(row, 'agreement_level_', uuidToReader)).toBe('3')
  })

  it('returns empty string for agreement_level_ when null', () => {
    const row: Row = { agreement_level_: null, name: 'A' }
    expect(renderDataCell(row, 'agreement_level_', uuidToReader)).toBe('')
  })

  it('renders readers_ by looking up UUIDs in the map, deduplicating', () => {
    const row: Row = { sources_: ['uuid-1', 'uuid-2', 'uuid-1'] }
    expect(renderDataCell(row, 'readers_', uuidToReader)).toBe('pdfplumber, camelot')
  })

  it('renders sources_ as joined UUID list', () => {
    const row: Row = { sources_: ['uuid-1', 'uuid-2'] }
    expect(renderDataCell(row, 'sources_', uuidToReader)).toBe('uuid-1, uuid-2')
  })

  it('renders a plain string data column', () => {
    const row: Row = { name: 'aspirin' }
    expect(renderDataCell(row, 'name', uuidToReader)).toBe('aspirin')
  })

  it('renders a ValueWithAgreement column as joined values', () => {
    const row: Row = {
      name: [
        { value: 'aspirin', agreement_level: 3 },
        { value: 'ASA', agreement_level: 1 },
      ],
    }
    expect(renderDataCell(row, 'name', uuidToReader)).toBe('aspirin, ASA')
  })

  it('returns empty string for a missing column', () => {
    const row: Row = { name: 'A' }
    expect(renderDataCell(row, 'dose', uuidToReader)).toBe('')
  })

  it('returns empty string for readers_ when the row has no sources_', () => {
    const row: Row = { name: 'A' }
    expect(renderDataCell(row, 'readers_', uuidToReader)).toBe('')
  })

  it('omits UUIDs from readers_ that have no matching reader in the map', () => {
    const row: Row = { sources_: ['unknown-uuid'] }
    expect(renderDataCell(row, 'readers_', uuidToReader)).toBe('')
  })
})
