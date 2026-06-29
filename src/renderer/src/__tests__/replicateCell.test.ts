import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { replicateCell } from '../actions/replicateCell'

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

describe('replicateCell', () => {
  it('fills all consecutive empty cells below with the source value', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: null, dose: '200mg' },
        { name: null, dose: '100mg' },
      ])
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: 'aspirin', dose: '200mg' },
      { name: 'aspirin', dose: '100mg' },
    ])
  })

  it('stops filling at the first non-empty cell below', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: null, dose: '200mg' },
        { name: 'ibuprofen', dose: '100mg' },
        { name: null, dose: '50mg' },
      ])
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: 'aspirin', dose: '200mg' },
      { name: 'ibuprofen', dose: '100mg' },
      { name: null, dose: '50mg' },
    ])
  })

  it('does nothing when the next cell is already non-empty', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
      { name: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('does nothing when the source row is the last row', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }])
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg' },
    ])
  })

  it('only modifies the targeted fragment, leaving others unchanged', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'aspirin' }, { name: null }],
        [{ name: null }, { name: null }]
      )
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([{ name: 'aspirin' }, { name: 'aspirin' }])
    expect(fragments[1].rows).toEqual([{ name: null }, { name: null }])
  })

  it('leaves other columns in the filled rows unchanged', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg', group: 'NSAID' },
        { name: null, dose: '200mg', group: 'analgesic' },
      ])
    )
    const result = replicateCell(file, 0, 0, 0, 'name')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { name: 'aspirin', dose: '500mg', group: 'NSAID' },
      { name: 'aspirin', dose: '200mg', group: 'analgesic' },
    ])
  })
})
