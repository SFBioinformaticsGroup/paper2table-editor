import { describe, it, expect } from 'vitest'
import { deleteColumn } from '../actions/deleteColumn'
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
        { city: 'Bogotá', country: 'Colombia' },
        { city: 'Santiago', country: 'Chile' },
      ])
    )
    const result = deleteColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect(result.tables[0]).toEqual(
      flatTable([{ city: 'Bogotá' }, { city: 'Santiago' }])
    )
  })

  it('removes the column from every fragment when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = deleteColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago' })
  })

  it('removes the column only from the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = deleteColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: false })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', country: 'Chile' })
  })

  it('leaves other columns intact', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia', continent: 'América del Sur' }])
    )
    const result = deleteColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ city: 'Bogotá', continent: 'América del Sur' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ city: 'Caracas', country: 'Venezuela' }], 3)
    const file = makeFile(flatTable([{ city: 'Bogotá', country: 'Colombia' }]), other)
    const result = deleteColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect(result.tables[1]).toBe(other)
  })
})
