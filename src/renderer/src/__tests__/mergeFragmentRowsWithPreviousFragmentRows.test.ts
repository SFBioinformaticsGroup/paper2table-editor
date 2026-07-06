import { describe, it, expect } from 'vitest'
import { mergeFragmentRowsWithPreviousFragmentRows } from '../actions/mergeFragmentRowsWithPreviousFragmentRows'
import type { Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

function fragmentedTable(...groups: Array<{ rows: Row[]; page: number }>): TablesFile['tables'][number] {
  return { table_fragments: groups }
}

describe('mergeFragmentRowsWithPreviousFragmentRows', () => {
  it('merges the rows of two fragments into a single fragment at the previous position', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 }
      )
    )
    const result = mergeFragmentRowsWithPreviousFragmentRows(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }, { name: 'B' }], page: 1 },
        { rows: [{ name: 'C' }], page: 3 },
      ],
    })
  })

  it('keeps the page number of the previous fragment', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 5 },
        { rows: [{ name: 'B' }], page: 9 }
      )
    )
    const result = mergeFragmentRowsWithPreviousFragmentRows(file, 0, 1)
    const merged = result.tables[0] as { rows: Row[]; page: number }
    expect(merged.page).toBe(5)
  })

  it('collapses to a flat TableWithRows when only one fragment remains', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 }
      )
    )
    const result = mergeFragmentRowsWithPreviousFragmentRows(file, 0, 1)
    expect(result.tables[0]).toEqual({
      rows: [{ name: 'A' }, { name: 'B' }],
      page: 1,
    })
  })

  it('is a no-op when fragmentIdx is 0', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 }
      )
    )
    expect(mergeFragmentRowsWithPreviousFragmentRows(file, 0, 0)).toBe(file)
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ drug: 'X' }], 5)
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 }
      ),
      other
    )
    const result = mergeFragmentRowsWithPreviousFragmentRows(file, 0, 1)
    expect(result.tables[1]).toBe(other)
  })
})
