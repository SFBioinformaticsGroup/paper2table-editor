import { describe, it, expect } from 'vitest'
import { deleteColumn } from '../editorActions'
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

describe('deleteColumn', () => {
  it('removes the named column from every row', () => {
    const file = makeFile(
      flatTable([
        { name: 'aspirin', dose: '500mg' },
        { name: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = deleteColumn(file, 0, 'dose')
    expect(result.tables[0]).toEqual(
      flatTable([{ name: 'aspirin' }, { name: 'ibuprofen' }])
    )
  })

  it('removes the column from every fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'A', dose: '5mg' }],
        [{ name: 'B', dose: '10mg' }]
      )
    )
    const result = deleteColumn(file, 0, 'dose')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ name: 'A' })
    expect(fragments[1].rows[0]).toEqual({ name: 'B' })
  })

  it('leaves other columns intact', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg', group: 'NSAID' }])
    )
    const result = deleteColumn(file, 0, 'dose')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: 'aspirin', group: 'NSAID' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ dose: '5mg' }], 3)
    const file = makeFile(flatTable([{ name: 'A', dose: '1mg' }]), other)
    const result = deleteColumn(file, 0, 'dose')
    expect(result.tables[1]).toBe(other)
  })
})
