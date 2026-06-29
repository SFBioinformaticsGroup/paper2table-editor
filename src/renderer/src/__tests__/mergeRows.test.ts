import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { mergeRows } from '../actions/mergeRows'

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

describe('mergeRows', () => {
  it('merges the row with the next row, concatenating different values with a space', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', note: 'anti-' },
        { name: 'ASA', note: 'inflammatory' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin ASA', note: 'anti- inflammatory' },
    ])
  })

  it('merges the row with the previous row when direction is prev', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', note: 'anti-' },
        { name: 'ASA', note: 'inflammatory' },
      ])
    )
    const result = mergeRows(file, 0, 0, 1, 'prev')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin ASA', note: 'anti- inflammatory' },
    ])
  })

  it('keeps identical values unchanged instead of duplicating them', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', group: 'NSAID' },
        { name: 'ASA', group: 'NSAID' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin ASA',
      group: 'NSAID',
    })
  })

  it('sets a null merged value when both cells are empty', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', note: null },
        { name: 'ASA', note: null },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin ASA',
      note: null,
    })
  })

  it('keeps agreement_level_ when both rows share the same level', () => {
    const file = makeFile(
      flatTable([
        { name: 'A', agreement_level_: 3 },
        { name: 'B', agreement_level_: 3 },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0].agreement_level_).toBe(3)
  })

  it('sets agreement_level_ to null when the two rows have different levels', () => {
    const file = makeFile(
      flatTable([
        { name: 'A', agreement_level_: 2 },
        { name: 'B', agreement_level_: 3 },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0].agreement_level_).toBeNull()
  })

  it('unions sources_ from both rows, deduplicating', () => {
    const file = makeFile(
      flatTable([
        { name: 'A', sources_: ['uuid-1', 'uuid-2'] },
        { name: 'B', sources_: ['uuid-2', 'uuid-3'] },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0].sources_).toEqual(['uuid-1', 'uuid-2', 'uuid-3'])
  })

  it('is a no-op when merging the first row with prev (out of bounds)', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }]))
    const result = mergeRows(file, 0, 0, 0, 'prev')
    expect(result).toStrictEqual(file)
  })

  it('is a no-op when merging the last row with next (out of bounds)', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }]))
    const result = mergeRows(file, 0, 0, 1, 'next')
    expect(result).toStrictEqual(file)
  })

  it('only modifies the targeted fragment, leaving others intact', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A' }, { name: 'B' }],
        [{ name: 'C' }, { name: 'D' }]
      )
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([{ name: 'A B' }])
    expect(fragments[1].rows).toEqual([{ name: 'C' }, { name: 'D' }])
  })
})
