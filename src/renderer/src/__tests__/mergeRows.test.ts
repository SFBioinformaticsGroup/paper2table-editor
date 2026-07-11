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
        { name: 'Buenos', note: 'capital' },
        { name: 'Aires', note: 'federal' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'Buenos Aires', note: 'capital federal' },
    ])
  })

  it('merges the row with the previous row when direction is prev', () => {
    const file = makeFile(
      flatTable([
        { name: 'Buenos', note: 'capital' },
        { name: 'Aires', note: 'federal' },
      ])
    )
    const result = mergeRows(file, 0, 0, 1, 'prev')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'Buenos Aires', note: 'capital federal' },
    ])
  })

  it('keeps identical values unchanged instead of duplicating them', () => {
    const file = makeFile(
      flatTable([
        { name: 'Bogotá', country: 'Colombia' },
        { name: 'Medellín', country: 'Colombia' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'Bogotá Medellín',
      country: 'Colombia',
    })
  })

  it('sets a null merged value when both cells are empty', () => {
    const file = makeFile(
      flatTable([
        { name: 'Lima', note: null },
        { name: 'Callao', note: null },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'Lima Callao',
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

  it('preserves row_ as a number when both rows have the same row_ value', () => {
    const file = makeFile(
      flatTable([
        { row_: 1, city: 'Santiago', sources_: ['uuid-1'] },
        { row_: 1, city: 'Santiago de Chile', sources_: ['uuid-2'] },
        { row_: 2, city: 'Valparaíso' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    const resultRows = (result.tables[0] as { rows: Row[] }).rows
    expect(resultRows).toEqual([
      { row_: 1, city: 'Santiago Santiago de Chile', sources_: ['uuid-1', 'uuid-2'] },
      { row_: 2, city: 'Valparaíso' },
    ])
  })

  it('assigns the minimum row_ to the merged row and re-enumerates subsequent rows', () => {
    const file = makeFile(
      flatTable([
        { row_: 1, city: 'Montevideo' },
        { row_: 2, city: 'Punta del Este' },
        { row_: 3, city: 'Salto' },
        { row_: 4, city: 'Colonia' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    const resultRows = (result.tables[0] as { rows: Row[] }).rows
    expect(resultRows).toEqual([
      { row_: 1, city: 'Montevideo Punta del Este' },
      { row_: 2, city: 'Salto' },
      { row_: 3, city: 'Colonia' },
    ])
  })

  it('re-enumerates correctly when merging in prev direction', () => {
    const file = makeFile(
      flatTable([
        { row_: 1, city: 'Caracas' },
        { row_: 2, city: 'Maracaibo' },
        { row_: 3, city: 'Valencia' },
      ])
    )
    const result = mergeRows(file, 0, 0, 1, 'prev')
    const resultRows = (result.tables[0] as { rows: Row[] }).rows
    expect(resultRows).toEqual([
      { row_: 1, city: 'Caracas Maracaibo' },
      { row_: 2, city: 'Valencia' },
    ])
  })

  it('does not produce string concatenation when merging rows with different numeric row_ values', () => {
    const file = makeFile(
      flatTable([
        { row_: 1, city: 'Quito' },
        { row_: 2, city: 'Guayaquil' },
      ])
    )
    const result = mergeRows(file, 0, 0, 0, 'next')
    const mergedRow = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(typeof mergedRow['row_']).toBe('number')
    expect(mergedRow['row_']).toBe(1)
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
