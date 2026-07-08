import { describe, it, expect } from 'vitest'
import { breakFragment } from '../actions/breakFragment'
import type { Row, TablesFile, TableWithFragments } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

function fragmentedTable(...fragments: { rows: Row[]; page: number }[]): TablesFile['tables'][number] {
  return { table_fragments: fragments }
}

describe('breakFragment', () => {
  it('splits a flat table into two fragments at the given row index', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
        { compound: 'ibuprofen', dose: '200mg' },
        { compound: 'naproxen', dose: '250mg' },
      ], 4)
    )
    const result = breakFragment(file, 0, 0, 1, 5)
    const rebuilt = result.tables[0] as TableWithFragments
    expect(rebuilt.table_fragments).toEqual([
      { rows: [{ compound: 'aspirin', dose: '100mg' }], page: 4 },
      { rows: [{ compound: 'ibuprofen', dose: '200mg' }, { compound: 'naproxen', dose: '250mg' }], page: 5 },
    ])
  })

  it('splits a fragment within a fragmented table, inserting the new fragment after the original', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ name: 'alpha' }, { name: 'beta' }, { name: 'gamma' }], page: 2 },
        { rows: [{ name: 'delta' }], page: 5 }
      )
    )
    const result = breakFragment(file, 0, 0, 2, 3)
    const rebuilt = result.tables[0] as TableWithFragments
    expect(rebuilt.table_fragments).toEqual([
      { rows: [{ name: 'alpha' }, { name: 'beta' }], page: 2 },
      { rows: [{ name: 'gamma' }], page: 3 },
      { rows: [{ name: 'delta' }], page: 5 },
    ])
  })

  it('preserves the table title when present', () => {
    const file = makeFile({ rows: [{ x: '1' }, { x: '2' }], page: 1, title: 'My Table' })
    const result = breakFragment(file, 0, 0, 1, 2)
    const rebuilt = result.tables[0] as TableWithFragments
    expect(rebuilt.title).toBe('My Table')
  })

  it('produces no title property when the original had none', () => {
    const file = makeFile(flatTable([{ x: '1' }, { x: '2' }]))
    const result = breakFragment(file, 0, 0, 1, 2)
    const rebuilt = result.tables[0] as TableWithFragments
    expect('title' in rebuilt).toBe(false)
  })

  it('the new fragment receives the specified page number while the head keeps the original page', () => {
    const file = makeFile(
      flatTable([{ label: 'first' }, { label: 'second' }], 7)
    )
    const result = breakFragment(file, 0, 0, 1, 10)
    const rebuilt = result.tables[0] as TableWithFragments
    expect(rebuilt.table_fragments[0].page).toBe(7)
    expect(rebuilt.table_fragments[1].page).toBe(10)
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ value: 'unchanged' }], 3)
    const file = makeFile(
      flatTable([{ a: '1' }, { a: '2' }]),
      otherTable
    )
    const result = breakFragment(file, 0, 0, 1, 2)
    expect(result.tables[1]).toBe(otherTable)
  })

  it('leaves other fragments in the same table untouched', () => {
    const file = makeFile(
      fragmentedTable(
        { rows: [{ col: 'p' }, { col: 'q' }], page: 1 },
        { rows: [{ col: 'r' }, { col: 's' }], page: 3 }
      )
    )
    const result = breakFragment(file, 0, 1, 1, 4)
    const rebuilt = result.tables[0] as TableWithFragments
    expect(rebuilt.table_fragments[0]).toEqual({ rows: [{ col: 'p' }, { col: 'q' }], page: 1 })
    expect(rebuilt.table_fragments[1]).toEqual({ rows: [{ col: 'r' }], page: 3 })
    expect(rebuilt.table_fragments[2]).toEqual({ rows: [{ col: 's' }], page: 4 })
  })
})
