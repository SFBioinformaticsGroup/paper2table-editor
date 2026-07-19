import { describe, it, expect } from 'vitest'
import { duplicateColumn } from '../actions/duplicateColumn'
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

describe('duplicateColumn', () => {
  it('inserts a copy of the column immediately after the source column', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg', group: 'NSAID' }])
    )
    const result = duplicateColumn(file, 0, 'dose')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin',
      dose: '500mg',
      dose_2: '500mg',
      group: 'NSAID',
    })
  })

  it('copies the column values including null', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: null },
      ])
    )
    const result = duplicateColumn(file, 0, 'dose')
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows).toEqual([
      { name: 'aspirin', dose: '500mg', dose_2: '500mg' },
      { name: 'ibuprofen', dose: null, dose_2: null },
    ])
  })

  it('uses uniqueName to avoid collisions (appends _2, _3)', () => {
    const file = makeFile(
      flatTable([{ name: 'A', dose: '5mg', dose_2: '10mg' }])
    )
    const result = duplicateColumn(file, 0, 'dose')
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(row).toEqual({ name: 'A', dose: '5mg', dose_2: '10mg', dose_3: '5mg' })
  })

  it('duplicates across all fragments', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', dose: '5mg' }],
        [{ name: 'B', dose: '10mg' }]
      )
    )
    const result = duplicateColumn(file, 0, 'dose')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ name: 'A', dose: '5mg', dose_2: '5mg' })
    expect(fragments[1].rows[0]).toEqual({ name: 'B', dose: '10mg', dose_2: '10mg' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A', dose: '5mg' }]), other)
    const result = duplicateColumn(file, 0, 'dose')
    expect(result.tables[1]).toBe(other)
  })
})
