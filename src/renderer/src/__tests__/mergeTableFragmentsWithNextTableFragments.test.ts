import { describe, it, expect } from 'vitest'
import { mergeTableFragmentsWithNextTableFragments } from '../actions/mergeTableFragmentsWithNextTableFragments'
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

describe('mergeTableFragmentsWithNextTableFragments', () => {
  it('combines the current table and the next into one fragmented table at the next position', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      flatTable([{ name: 'B' }], 2)
    )
    const result = mergeTableFragmentsWithNextTableFragments(file, 0)
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
    expect(mergeTableFragmentsWithNextTableFragments(file, 0)).toBe(file)
  })

  it('merges all fragments of a multi-fragment table with the next flat table', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }]),
      flatTable([{ name: 'C' }], 3)
    )
    const result = mergeTableFragmentsWithNextTableFragments(file, 0)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 },
      ],
    })
  })

  it('leaves a third table untouched when merging the first two', () => {
    const third = flatTable([{ name: 'Z' }], 9)
    const file = makeFile(flatTable([{ name: 'A' }], 1), flatTable([{ name: 'B' }], 2), third)
    const result = mergeTableFragmentsWithNextTableFragments(file, 0)
    expect(result.tables).toHaveLength(2)
    expect(result.tables[1]).toBe(third)
  })
})
