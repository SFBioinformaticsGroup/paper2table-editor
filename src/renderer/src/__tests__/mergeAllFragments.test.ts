import { describe, it, expect } from 'vitest'
import { mergeAllFragments } from '../actions/mergeAllFragments'
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

describe('mergeAllFragments', () => {
  it('combines two flat tables into a single TableWithFragments', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      flatTable([{ name: 'B' }], 2)
    )
    const result = mergeAllFragments(file)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
      ],
    })
  })

  it('combines a mixed flat and multi-fragment table into one TableWithFragments', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      fragmentedTable(
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 }
      )
    )
    const result = mergeAllFragments(file)
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0]).toEqual({
      table_fragments: [
        { rows: [{ name: 'A' }], page: 1 },
        { rows: [{ name: 'B' }], page: 2 },
        { rows: [{ name: 'C' }], page: 3 },
      ],
    })
  })

  it('is a no-op when there is only one table', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    expect(mergeAllFragments(file)).toBe(file)
  })

  it('preserves each fragment page number', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 7),
      flatTable([{ name: 'B' }], 11)
    )
    const result = mergeAllFragments(file)
    const fragments = (result.tables[0] as { table_fragments: Array<{ page: number }> }).table_fragments
    expect(fragments[0].page).toBe(7)
    expect(fragments[1].page).toBe(11)
  })

  it('preserves other top-level file fields', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }], 1),
      flatTable([{ name: 'B' }], 2)
    )
    const fileWithCitation = { ...file, citation: 'Test citation', uuid: 'abc-123' }
    const result = mergeAllFragments(fileWithCitation)
    expect(result.citation).toBe('Test citation')
    expect(result.uuid).toBe('abc-123')
  })
})
