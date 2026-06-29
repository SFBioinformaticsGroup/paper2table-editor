import { describe, it, expect } from 'vitest'
import type { Row, TablesFile, TableWithFragments } from '../types'
import { mergeLastRowWithNextFragment } from '../actions/mergeLastRowWithNextFragment'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function fragmentedTable(...groups: Row[][]): TableWithFragments {
  return {
    table_fragments: groups.map((rows, i) => ({ rows, page: i + 1 })),
  }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

function fragments(file: TablesFile, tableIdx: number) {
  return (file.tables[tableIdx] as TableWithFragments).table_fragments
}

describe('mergeLastRowWithNextFragment', () => {
  it('merges the last row of the given fragment with the first row of the next fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'aspirin', note: 'anti-' }],
        [{ name: 'ASA', note: 'inflammatory' }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows).toEqual([
      { name: 'aspirin ASA', note: 'anti- inflammatory' },
    ])
    expect(fragments(result, 0)[1].rows).toEqual([])
  })

  it('keeps identical cell values unchanged instead of duplicating them', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'aspirin', group: 'NSAID' }],
        [{ name: 'ASA', group: 'NSAID' }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows[0]).toEqual({
      name: 'aspirin ASA',
      group: 'NSAID',
    })
  })

  it('sets null when both merged cells are empty', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'aspirin', note: null }],
        [{ name: 'ASA', note: null }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows[0]).toEqual({
      name: 'aspirin ASA',
      note: null,
    })
  })

  it('keeps agreement_level_ when both rows share the same level', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', agreement_level_: 3 }],
        [{ name: 'B', agreement_level_: 3 }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows[0].agreement_level_).toBe(3)
  })

  it('sets agreement_level_ to null when the two rows differ', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', agreement_level_: 2 }],
        [{ name: 'B', agreement_level_: 3 }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows[0].agreement_level_).toBeNull()
  })

  it('unions sources_ from both rows, deduplicating', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', sources_: ['uuid-1', 'uuid-2'] }],
        [{ name: 'B', sources_: ['uuid-2', 'uuid-3'] }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows[0].sources_).toEqual(['uuid-1', 'uuid-2', 'uuid-3'])
  })

  it('only merges the last row of the first fragment, leaving other rows intact', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A' }, { name: 'B' }],
        [{ name: 'C' }, { name: 'D' }]
      )
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(fragments(result, 0)[0].rows).toEqual([
      { name: 'A' },
      { name: 'B C' },
    ])
    expect(fragments(result, 0)[1].rows).toEqual([{ name: 'D' }])
  })

  it('is a no-op on a flat table (no fragments)', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }]))
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(result).toStrictEqual(file)
  })

  it('is a no-op when fragmentIdx is the last fragment', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }])
    )
    const result = mergeLastRowWithNextFragment(file, 0, 1)
    expect(result).toStrictEqual(file)
  })

  it('is a no-op when the first fragment is empty', () => {
    const file = makeFile(
      fragmentedTable([], [{ name: 'B' }])
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(result).toStrictEqual(file)
  })

  it('is a no-op when the next fragment is empty', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [])
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(result).toStrictEqual(file)
  })

  it('only modifies the targeted table, leaving other tables intact', () => {
    const otherTable = fragmentedTable([{ name: 'X' }], [{ name: 'Y' }])
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }]),
      otherTable
    )
    const result = mergeLastRowWithNextFragment(file, 0, 0)
    expect(result.tables[1]).toStrictEqual(otherTable)
  })
})
