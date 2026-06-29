import { describe, it, expect } from 'vitest'
import { deleteFragment } from '../actions/deleteFragment'
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

describe('deleteFragment', () => {
  it('removes a fragment from a multi-fragment table, preserving original page numbers', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }], [{ name: 'C' }])
    )
    const result = deleteFragment(file, 0, 1)
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

  it('leaves other tables untouched', () => {
    const other = flatTable([{ drug: 'X' }], 5)
    const file = makeFile(fragmentedTable([{ name: 'A' }], [{ name: 'B' }]), other)
    const result = deleteFragment(file, 0, 0)
    expect(result.tables[1]).toBe(other)
  })
})
