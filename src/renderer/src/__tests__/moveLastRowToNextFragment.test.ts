import { describe, it, expect } from 'vitest'
import { moveLastRowToNextFragment } from '../actions/moveLastRowToNextFragment'
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

describe('moveLastRowToNextFragment', () => {
  it('moves the last row of a fragment to the start of the next fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ col: 'A' }, { col: 'B' }],
        [{ col: 'C' }]
      )
    )
    const result = moveLastRowToNextFragment(file, 0, 0)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ col: 'A' }], page: 1 },
        { rows: [{ col: 'B' }, { col: 'C' }], page: 2 },
      ],
    })
  })

  it('works on a middle fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ col: 'A' }],
        [{ col: 'B' }, { col: 'C' }],
        [{ col: 'D' }]
      )
    )
    const result = moveLastRowToNextFragment(file, 0, 1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ col: 'A' }], page: 1 },
        { rows: [{ col: 'B' }], page: 2 },
        { rows: [{ col: 'C' }, { col: 'D' }], page: 3 },
      ],
    })
  })

  it('returns file unchanged when source fragment has only one row', () => {
    const file = makeFile(
      fragmentedTable([{ col: 'A' }], [{ col: 'B' }])
    )
    const result = moveLastRowToNextFragment(file, 0, 0)
    expect(result).toBe(file)
  })

  it('returns file unchanged when fragmentIdx is the last fragment', () => {
    const file = makeFile(
      fragmentedTable([{ col: 'A' }, { col: 'B' }], [{ col: 'C' }])
    )
    const result = moveLastRowToNextFragment(file, 0, 1)
    expect(result).toBe(file)
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ drug: 'X' }], 5)
    const file = makeFile(
      fragmentedTable([{ col: 'A' }, { col: 'B' }], [{ col: 'C' }]),
      otherTable
    )
    const result = moveLastRowToNextFragment(file, 0, 0)
    expect(result.tables[1]).toBe(otherTable)
  })
})
