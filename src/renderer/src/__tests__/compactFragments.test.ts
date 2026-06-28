import { describe, it, expect } from 'vitest'
import { compactFragments } from '../editorActions'
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

  it('applied to a flat table returns an equivalent flat table', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }], 7))
    const result = compactFragments(file, 0)
    expect(result.tables[0]).toEqual({ rows: [{ name: 'A' }, { name: 'B' }], page: 7 })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ drug: 'X' }], 5)
    const file = makeFile(fragmentedTable([{ name: 'A' }], [{ name: 'B' }]), other)
    const result = compactFragments(file, 0)
    expect(result.tables[1]).toBe(other)
  })
})
