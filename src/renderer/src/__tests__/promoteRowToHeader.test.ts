import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { promoteRowToHeader } from '../actions/promoteRowToHeader'

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

describe('promoteRowToHeader', () => {
  it('renames column keys using the promoted row values', () => {
    const file = makeFile(
      flatTable([
        { col1: 'Drug name', col2: 'Dose' },
        { col1: 'aspirin', col2: '500mg' },
        { col1: 'ibuprofen', col2: '200mg' },
      ])
    )
    const result = promoteRowToHeader(file, 0, 0, 0)
    expect(result.tables[0]).toEqual(
      flatTable([
        { 'Drug name': 'aspirin', Dose: '500mg' },
        { 'Drug name': 'ibuprofen', Dose: '200mg' },
      ])
    )
  })

  it('removes the promoted row itself', () => {
    const file = makeFile(flatTable([{ col1: 'Name' }, { col1: 'aspirin' }, { col1: 'ibuprofen' }]))
    const result = promoteRowToHeader(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { Name: 'aspirin' },
      { Name: 'ibuprofen' },
    ])
  })

  it('falls back to the original column name when the promoted value is empty', () => {
    const file = makeFile(flatTable([{ col1: '', col2: 'Dose' }, { col1: 'A', col2: '5mg' }]))
    const result = promoteRowToHeader(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ col1: 'A', Dose: '5mg' })
  })

  it('renames columns across all fragments of the table', () => {
    const file = makeFile(
      fragmentedTable(
        [{ col1: 'Drug', col2: 'Dose' }, { col1: 'aspirin', col2: '500mg' }],
        [{ col1: 'ibuprofen', col2: '200mg' }]
      )
    )
    const result = promoteRowToHeader(file, 0, 0, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([{ Drug: 'aspirin', Dose: '500mg' }])
    expect(fragments[1].rows).toEqual([{ Drug: 'ibuprofen', Dose: '200mg' }])
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ col1: 'X' }], 5)
    const file = makeFile(flatTable([{ col1: 'Header' }, { col1: 'value' }]), other)
    const result = promoteRowToHeader(file, 0, 0, 0)
    expect(result.tables[1]).toBe(other)
  })
})
