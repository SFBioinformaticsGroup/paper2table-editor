import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { editCell } from '../actions/editCell'

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

describe('editCell', () => {
  it('updates the value of the specified cell', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }, { name: 'ibuprofen', dose: '200mg' }])
    )
    const result = editCell(file, 0, 0, 0, 'dose', '1000mg')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '1000mg' },
      { name: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('stores the new value as a plain string, replacing any previous type', () => {
    const file = makeFile(
      flatTable([{ name: [{ value: 'aspirin', agreement_level: 3 }] }])
    )
    const result = editCell(file, 0, 0, 0, 'name', 'ASA')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: 'ASA' })
  })

  it('only modifies the targeted fragment, leaving others unchanged', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A' }],
        [{ name: 'B' }]
      )
    )
    const result = editCell(file, 0, 0, 0, 'name', 'X')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ name: 'X' })
    expect(fragments[1].rows[0]).toEqual({ name: 'B' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'Z' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = editCell(file, 0, 0, 0, 'name', 'X')
    expect(result.tables[1]).toBe(other)
  })
})
