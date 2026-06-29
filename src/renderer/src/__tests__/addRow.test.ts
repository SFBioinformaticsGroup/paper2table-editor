import { describe, it, expect } from 'vitest'
import { addRow } from '../actions/addRow'
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

describe('addRow', () => {
  it('inserts an empty row after the specified row index', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }, { name: 'ibuprofen', dose: '200mg' }])
    )
    const result = addRow(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: null, dose: null },
      { name: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('appends a row at the end when afterRowIdx is omitted', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }])
    )
    const result = addRow(file, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: null, dose: null },
    ])
  })

  it('inserts at the top when afterRowIdx is -1', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin' }, { name: 'ibuprofen' }])
    )
    const result = addRow(file, 0, 0, -1)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: null },
      { name: 'aspirin' },
      { name: 'ibuprofen' },
    ])
  })

  it('only modifies the targeted fragment, leaving others intact', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }], [{ name: 'B' }])
    )
    const result = addRow(file, 0, 0, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([{ name: 'A' }, { name: null }])
    expect(fragments[1].rows).toEqual([{ name: 'B' }])
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = addRow(file, 0, 0, 0)
    expect(result.tables[1]).toBe(other)
  })
})
