import { describe, it, expect } from 'vitest'
import { mergeTableFragmentsWithPreviousTableFragments } from '../actions/mergeTableFragmentsWithPreviousTableFragments'
import type { Row, TablesFile } from '../types'

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

describe('mergeTableFragmentsWithPreviousTableFragments', () => {
  it('combines the previous table and the current into one fragmented table at the previous position', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      flatTable([{ name: 'B' }], 2)
    )
    const result = mergeTableFragmentsWithPreviousTableFragments(file, 1)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
      ],
    })
  })

  it('is a no-op when tableIdx is 0', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    expect(mergeTableFragmentsWithPreviousTableFragments(file, 0)).toBe(file)
  })

  it('merges the previous flat table with all fragments of a multi-fragment current table', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      fragmentedTable([{ name: 'B' }], [{ name: 'C' }])
    )
    const result = mergeTableFragmentsWithPreviousTableFragments(file, 1)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 1 },
        { rows: [{ name: 'C' }], page: 2 },
      ],
    })
  })

  it('leaves a preceding table untouched when merging the last two of three', () => {
    const first = flatTable([{ name: 'Z' }], 9)
    const file = makeFile(first, flatTable([{ name: 'A' }], 1), flatTable([{ name: 'B' }], 2))
    const result = mergeTableFragmentsWithPreviousTableFragments(file, 2)
    expect(result.tables).toHaveLength(2)
    expect(result.tables[0]).toBe(first)
  })
})
