import { describe, it, expect } from 'vitest'
import { addColumn } from '../actions/addColumn'
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

describe('addColumn', () => {
  it('appends a null column at the end of each row when afterColName is omitted', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = addColumn(file, 0, 'unit')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg', unit: null },
      { name: 'ibuprofen', dose: '200mg', unit: null },
    ])
  })

  it('inserts the new column immediately after afterColName', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg', group: 'NSAID' }])
    )
    const result = addColumn(file, 0, 'unit', 'dose')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin',
      dose: '500mg',
      unit: null,
      group: 'NSAID',
    })
  })

  it('avoids name collision by appending _2', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }])
    )
    const result = addColumn(file, 0, 'dose')
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect('dose_2' in row).toBe(true)
    expect(row.dose_2).toBeNull()
  })

  it('adds the column to every fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', dose: '5mg' }],
        [{ name: 'B', dose: '10mg' }]
      )
    )
    const result = addColumn(file, 0, 'unit')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ name: 'A', dose: '5mg', unit: null })
    expect(fragments[1].rows[0]).toEqual({ name: 'B', dose: '10mg', unit: null })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = addColumn(file, 0, 'dose')
    expect(result.tables[1]).toBe(other)
  })
})
