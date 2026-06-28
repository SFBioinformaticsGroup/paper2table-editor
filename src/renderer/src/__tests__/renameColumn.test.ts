import { describe, it, expect } from 'vitest'
import { renameColumn } from '../editorActions'
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

describe('renameColumn', () => {
  it('renames the column key in all rows', () => {
    const file = makeFile(
      flatTable([
        { drug: 'aspirin', dose: '500mg' },
        { drug: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = renameColumn(file, 0, 'drug', 'medication')
    expect(result.tables[0]).toEqual(
      flatTable([
        { medication: 'aspirin', dose: '500mg' },
        { medication: 'ibuprofen', dose: '200mg' },
      ])
    )
  })

  it('avoids collision by appending _2', () => {
    const file = makeFile(
      flatTable([{ col1: 'A', col2: 'B', col3: 'C' }])
    )
    const result = renameColumn(file, 0, 'col1', 'col2')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ col2_2: 'A', col2: 'B', col3: 'C' })
  })

  it('increments suffix beyond _2 when _2 is also taken', () => {
    const file = makeFile(
      flatTable([{ col1: 'A', col2: 'B', col2_2: 'C' }])
    )
    const result = renameColumn(file, 0, 'col1', 'col2')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ col2_3: 'A', col2: 'B', col2_2: 'C' })
  })

  it('renames across all fragments', () => {
    const file = makeFile(
      fragmentedTable([{ drug: 'A' }], [{ drug: 'B' }])
    )
    const result = renameColumn(file, 0, 'drug', 'medication')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ medication: 'A' })
    expect(fragments[1].rows[0]).toEqual({ medication: 'B' })
  })
})
