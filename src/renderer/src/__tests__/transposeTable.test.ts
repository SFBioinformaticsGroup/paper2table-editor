import { describe, it, expect } from 'vitest'
import { transposeTable } from '../editorActions'
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

describe('transposeTable', () => {
  it('rotates rows into columns: each original column becomes a new row', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = transposeTable(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { '0': 'name', '1': 'aspirin', '2': 'ibuprofen' },
      { '0': 'dose', '1': '500mg', '2': '200mg' },
    ])
  })

  it('uses column key "0" for original column names and "1", "2", … for original row values', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin' }]))
    const result = transposeTable(file, 0)
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows[0]['0']).toBe('drug')
    expect(rows[0]['1']).toBe('aspirin')
  })

  it('renders ValueWithAgreement cells to plain strings in the transposed output', () => {
    const file = makeFile(
      flatTable([{ name: [{ value: 'aspirin', agreement_level: 3 }] }])
    )
    const result = transposeTable(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]['1']).toBe('aspirin')
  })

  it('transposes each fragment independently', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', dose: '5mg' }],
        [{ name: 'B', dose: '10mg' }]
      )
    )
    const result = transposeTable(file, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([
      { '0': 'name', '1': 'A' },
      { '0': 'dose', '1': '5mg' },
    ])
    expect(fragments[1].rows).toEqual([
      { '0': 'name', '1': 'B' },
      { '0': 'dose', '1': '10mg' },
    ])
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = transposeTable(file, 0)
    expect(result.tables[1]).toBe(other)
  })
})
