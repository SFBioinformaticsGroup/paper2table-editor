import { describe, it, expect } from 'vitest'
import { mergeFragmentRowsWithNextFragmentRows } from '../actions/mergeFragmentRowsWithNextFragmentRows'
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

describe('mergeFragmentRowsWithNextFragmentRows', () => {
  it('merges the rows of two fragments into a single fragment at the first position', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 }
      )
    )
    const result = mergeFragmentRowsWithNextFragmentRows(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }, { name: 'C' }], page: 2 },
      ],
    })
  })

  it('keeps the page number of the first of the two merged fragments', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 5 },
        { rows: [{ name: 'B' }], page: 9 }
      )
    )
    const result = mergeFragmentRowsWithNextFragmentRows(file, 0, 0)
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
    const result = mergeFragmentRowsWithNextFragmentRows(file, 0, 0)
    expect(result.tables[0]).toEqual({
      rows: [{ name: 'A' }, { name: 'B' }],
      page: 1,
    })
  })

  it('is a no-op when fragmentIdx is the last fragment', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 }
      )
    )
    expect(mergeFragmentRowsWithNextFragmentRows(file, 0, 1)).toBe(file)
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
    const result = mergeFragmentRowsWithNextFragmentRows(file, 0, 0)
    expect(result.tables[1]).toBe(other)
  })
})
