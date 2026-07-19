import { describe, it, expect } from 'vitest'
import { duplicateRow } from '../actions/duplicateRow'
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

describe('duplicateRow', () => {
  it('inserts a copy of the row immediately after the source row', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = duplicateRow(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: 'aspirin', dose: '500mg' },
      { name: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('increments row_ on the new row and shifts subsequent row_ values', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg', row_: 1 },
        { name: 'ibuprofen', dose: '200mg', row_: 2 },
        { name: 'paracetamol', dose: '1g', row_: 3 },
      ])
    )
    const result = duplicateRow(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg', row_: 1 },
      { name: 'aspirin', dose: '500mg', row_: 2 },
      { name: 'ibuprofen', dose: '200mg', row_: 3 },
      { name: 'paracetamol', dose: '1g', row_: 4 },
    ])
  })

  it('does not shift row_ values when source row has no row_', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = duplicateRow(file, 0, 0, 1)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: 'ibuprofen', dose: '200mg' },
      { name: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('only modifies the targeted fragment, leaving others intact', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A', row_: 1 }], [{ name: 'B', row_: 2 }])
    )
    const result = duplicateRow(file, 0, 0, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([
      { name: 'A', row_: 1 },
      { name: 'A', row_: 2 },
    ])
    expect(fragments[1].rows).toEqual([{ name: 'B', row_: 2 }])
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = duplicateRow(file, 0, 0, 0)
    expect(result.tables[1]).toBe(other)
  })
})
