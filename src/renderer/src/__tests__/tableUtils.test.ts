import { describe, it, expect } from 'vitest'
import {
  agreementClass,
  buildFragmentColumns,
  buildPaperAnchorIds,
  collectPaperSourceUuids,
  columnNames,
  curationIconInfo,
  flattenMetadataRows,
  getMultivaluedExpansion,
  getRowColumns,
  isEmptyCellValue,
  isEmptyRow,
  readerEmoji,
  renderCitationItems,
  renderColumnValue,
  renderDataCell,
  rowPaletteClass,
  shiftRowNumbers,
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

  it('strips curation_type_ from the result', () => {
    const row: Row = { curation_type_: 'manual', name: 'aspirin' }
    expect(getRowColumns(row)).toEqual({ name: 'aspirin' })
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

  it('skips curation_type_ as a meta column', () => {
    const rows: Row[] = [{ curation_type_: 'automatic', name: 'A' }]
    expect(columnNames(rows)).toEqual(['name'])
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

  it('treats curation_type_ as a meta column', () => {
    const row: Row = { curation_type_: 'manual', name: '' }
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

// ── renderCitationItems ──────────────────────────────────────────────────────

describe('renderCitationItems', () => {
  it('returns empty array for null', () => {
    expect(renderCitationItems(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(renderCitationItems(undefined)).toEqual([])
  })

  it('returns a single-item array for a plain string citation', () => {
    expect(renderCitationItems('Smith et al. 2020')).toEqual(['Smith et al. 2020'])
  })

  it('splits a newline-separated citation string into items', () => {
    expect(renderCitationItems('Smith 2020;\nJones 2021;\nBrown 2022')).toEqual([
      'Smith 2020;',
      'Jones 2021;',
      'Brown 2022',
    ])
  })

  it('returns one item per citation array entry', () => {
    const citation = [
      { value: 'Smith 2020', agreement_level: 3 },
      { value: 'Jones 2021', agreement_level: 2 },
    ]
    expect(renderCitationItems(citation)).toEqual(['Smith 2020', 'Jones 2021'])
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

// ── isEmptyCellValue ─────────────────────────────────────────────────────────

describe('isEmptyCellValue', () => {
  it('returns true for null', () => {
    expect(isEmptyCellValue(null)).toBe(true)
  })

  it('returns true for undefined', () => {
    expect(isEmptyCellValue(undefined)).toBe(true)
  })

  it('returns true for an empty string', () => {
    expect(isEmptyCellValue('')).toBe(true)
  })

  it('returns true for a whitespace-only string', () => {
    expect(isEmptyCellValue('   ')).toBe(true)
  })

  it('returns false for a non-empty string', () => {
    expect(isEmptyCellValue('Rosa')).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isEmptyCellValue(0)).toBe(false)
  })

  it('returns false for a boolean', () => {
    expect(isEmptyCellValue(false)).toBe(false)
  })
})

// ── curationIconInfo ─────────────────────────────────────────────────────────

describe('curationIconInfo', () => {
  it('returns null for undefined', () => {
    expect(curationIconInfo(undefined)).toBe(null)
  })

  it('returns null for null', () => {
    expect(curationIconInfo(null)).toBe(null)
  })

  it('returns null for "none"', () => {
    expect(curationIconInfo('none')).toBe(null)
  })

  it('returns automatic info for "automatic"', () => {
    expect(curationIconInfo('automatic')).toEqual({ type: 'automatic', title: 'Automatically curated' })
  })

  it('returns manual info for "manual"', () => {
    expect(curationIconInfo('manual')).toEqual({ type: 'manual', title: 'Manually curated' })
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

  it('skips the settings key (displayed in a separate UI section)', () => {
    const metadata = { reader: 'pdfplumber', settings: { threshold: 0.5, lang: 'es' } }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([['reader', 'pdfplumber']])
  })

  it('skips the agreement_method key (displayed in a separate UI section)', () => {
    const metadata = { reader: 'tablemerge', agreement_method: 'simple-count' }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([['reader', 'tablemerge']])
  })

  it('joins array values with ", "', () => {
    const metadata = { tags: ['a', 'b', 'c'] }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([['tags', 'a, b, c']])
  })

  it('flattens nested objects with dot notation', () => {
    const metadata = { config: { mode: 'fast', retries: 3 } }
    const rows = flattenMetadataRows(metadata)
    expect(rows).toEqual([
      ['config.mode', 'fast'],
      ['config.retries', '3'],
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

  it('omits row_ when every row has a null row_ value', () => {
    const rows: Row[] = [
      { row_: null, name: 'A' },
      { row_: null, name: 'B' },
    ]
    expect(buildFragmentColumns(rows)).toEqual(['name'])
  })

  it('omits citation_, path_, page_, fragment_ when all values are null', () => {
    const rows: Row[] = [
      { name: 'A', citation_: null, path_: null, page_: null, fragment_: null },
      { name: 'B', citation_: null, path_: null, page_: null, fragment_: null },
    ]
    expect(buildFragmentColumns(rows)).toEqual(['name'])
  })

  it('keeps citation_, path_, page_, fragment_ when any row has a value', () => {
    const rows: Row[] = [
      { name: 'A', citation_: 'Smith 2020', path_: null, page_: 3, fragment_: null },
      { name: 'B', citation_: null, path_: '/x.pdf', page_: null, fragment_: 1 },
    ]
    expect(buildFragmentColumns(rows)).toEqual(['name', 'citation_', 'path_', 'page_', 'fragment_'])
  })

  it('omits a meta column whose only values are empty strings', () => {
    const rows: Row[] = [
      { name: 'A', citation_: '' },
      { name: 'B', citation_: '' },
    ]
    expect(buildFragmentColumns(rows)).toEqual(['name'])
  })
})

// ── getMultivaluedExpansion ──────────────────────────────────────────────────

describe('getMultivaluedExpansion', () => {
  it('returns span 1 and empty multivaluedCols for a single-valued row', () => {
    const row: Row = { family: 'Apiaceae', species: 'Ammi majus' }
    const { span, multivaluedCols } = getMultivaluedExpansion(row, ['family', 'species'])
    expect(span).toBe(1)
    expect(multivaluedCols.size).toBe(0)
  })

  it('returns span equal to the length of the multi-valued column', () => {
    const row: Row = {
      family: 'Apiaceae',
      species: [
        { value: 'Ammi majus', agreement_level: 1 },
        { value: 'Carum carvi', agreement_level: 2 },
      ],
    }
    const { span, multivaluedCols } = getMultivaluedExpansion(row, ['family', 'species'])
    expect(span).toBe(2)
    expect(multivaluedCols).toEqual(new Map([
      ['species', [
        { value: 'Ammi majus', agreement_level: 1 },
        { value: 'Carum carvi', agreement_level: 2 },
      ]],
    ]))
  })

  it('uses the max span when multiple columns are multi-valued with different lengths', () => {
    const row: Row = {
      family: [
        { value: 'Apiaceae', agreement_level: 1 },
        { value: 'Fabaceae', agreement_level: 1 },
        { value: 'Rosaceae', agreement_level: 1 },
      ],
      species: [
        { value: 'Ammi majus', agreement_level: 1 },
        { value: 'Carum carvi', agreement_level: 1 },
      ],
    }
    const { span } = getMultivaluedExpansion(row, ['family', 'species'])
    expect(span).toBe(3)
  })

  it('ignores single-element lists (convergent rows)', () => {
    const row: Row = { species: [{ value: 'Ammi majus', agreement_level: 1 }] }
    const { span, multivaluedCols } = getMultivaluedExpansion(row, ['species'])
    expect(span).toBe(1)
    expect(multivaluedCols.size).toBe(0)
  })

  it('ignores columns not present in the row', () => {
    const row: Row = { family: 'Apiaceae' }
    const { span, multivaluedCols } = getMultivaluedExpansion(row, ['family', 'species'])
    expect(span).toBe(1)
    expect(multivaluedCols.size).toBe(0)
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

// ── shiftRowNumbers ──────────────────────────────────────────────────────────

describe('shiftRowNumbers', () => {
  it('increments row_ values >= fromRowNum by the given delta', () => {
    const rows: Row[] = [
      { name: 'A', row_: 1 },
      { name: 'B', row_: 2 },
      { name: 'C', row_: 3 },
    ]
    expect(shiftRowNumbers(rows, 2, 1)).toEqual([
      { name: 'A', row_: 1 },
      { name: 'B', row_: 3 },
      { name: 'C', row_: 4 },
    ])
  })

  it('decrements row_ values >= fromRowNum when delta is negative', () => {
    const rows: Row[] = [
      { name: 'A', row_: 1 },
      { name: 'B', row_: 2 },
      { name: 'C', row_: 3 },
    ]
    expect(shiftRowNumbers(rows, 2, -1)).toEqual([
      { name: 'A', row_: 1 },
      { name: 'B', row_: 1 },
      { name: 'C', row_: 2 },
    ])
  })

  it('leaves rows with row_ below fromRowNum unchanged', () => {
    const rows: Row[] = [
      { name: 'A', row_: 1 },
      { name: 'B', row_: 2 },
    ]
    expect(shiftRowNumbers(rows, 5, 1)).toEqual([
      { name: 'A', row_: 1 },
      { name: 'B', row_: 2 },
    ])
  })

  it('leaves rows without a row_ key unchanged', () => {
    const rows: Row[] = [
      { name: 'A' },
      { name: 'B', row_: 3 },
    ]
    expect(shiftRowNumbers(rows, 1, 1)).toEqual([
      { name: 'A' },
      { name: 'B', row_: 4 },
    ])
  })

  it('shifts the boundary row (row_ exactly equal to fromRowNum)', () => {
    const rows: Row[] = [{ name: 'A', row_: 3 }]
    expect(shiftRowNumbers(rows, 3, 1)).toEqual([{ name: 'A', row_: 4 }])
  })

  it('returns an empty array unchanged', () => {
    expect(shiftRowNumbers([], 1, 1)).toEqual([])
  })
})
