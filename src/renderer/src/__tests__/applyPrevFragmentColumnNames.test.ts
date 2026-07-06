import { describe, it, expect } from 'vitest'
import { applyPrevFragmentColumnNames, hasNonSemanticColumns } from '../actions/applyPrevFragmentColumnNames'
import type { Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function fragmentedTable(...groups: Row[][]): TablesFile['tables'][number] {
  return {
    table_fragments: groups.map((rows, i) => ({ rows, page: i + 1 })),
  }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

describe('hasNonSemanticColumns', () => {
  it('returns true when all column names are numeric', () => {
    expect(hasNonSemanticColumns(['0', '1', '2'])).toBe(true)
  })

  it('returns false when any column name is non-numeric', () => {
    expect(hasNonSemanticColumns(['0', 'Drug', '2'])).toBe(false)
  })

  it('returns false for an empty column list', () => {
    expect(hasNonSemanticColumns([])).toBe(false)
  })
})

describe('applyPrevFragmentColumnNames', () => {
  it('renames numeric columns to match the previous fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin', Dose: '100mg' }],
        [{ '0': 'ibuprofen', '1': '200mg' }]
      )
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ Drug: 'aspirin', Dose: '100mg' }], page: 1 },
        { rows: [{ Drug: 'ibuprofen', Dose: '200mg' }], page: 2 },
      ],
    })
  })

  it('renames only the first N columns when target has more columns than source', () => {
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin' }],
        [{ '0': 'ibuprofen', '1': '200mg' }]
      )
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ Drug: 'aspirin' }], page: 1 },
        { rows: [{ Drug: 'ibuprofen', '1': '200mg' }], page: 2 },
      ],
    })
  })

  it('preserves reserved keys (agreement_level_, sources_)', () => {
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin', Dose: '100mg' }],
        [{ agreement_level_: 2, sources_: ['abc'], '0': 'ibuprofen', '1': '200mg' }]
      )
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ Drug: 'aspirin', Dose: '100mg' }], page: 1 },
        { rows: [{ agreement_level_: 2, sources_: ['abc'], Drug: 'ibuprofen', Dose: '200mg' }], page: 2 },
      ],
    })
  })

  it('returns file unchanged when target fragment has fewer columns than source', () => {
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin', Dose: '100mg', Effect: 'pain relief' }],
        [{ '0': 'ibuprofen', '1': '200mg' }]
      )
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result).toBe(file)
  })

  it('returns file unchanged when fragmentIdx is 0', () => {
    const file = makeFile(
      fragmentedTable([{ '0': 'aspirin' }], [{ Drug: 'ibuprofen' }])
    )
    const result = applyPrevFragmentColumnNames(file, 0, 0)
    expect(result).toBe(file)
  })

  it('leaves other fragments untouched', () => {
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin' }],
        [{ '0': 'ibuprofen' }],
        [{ '0': 'paracetamol' }]
      )
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ Drug: 'aspirin' }], page: 1 },
        { rows: [{ Drug: 'ibuprofen' }], page: 2 },
        { rows: [{ '0': 'paracetamol' }], page: 3 },
      ],
    })
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ compound: 'X' }], 5)
    const file = makeFile(
      fragmentedTable(
        [{ Drug: 'aspirin' }],
        [{ '0': 'ibuprofen' }]
      ),
      otherTable
    )
    const result = applyPrevFragmentColumnNames(file, 0, 1)
    expect(result.tables[1]).toBe(otherTable)
  })
})
