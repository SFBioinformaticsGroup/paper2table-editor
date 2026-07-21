import { describe, it, expect } from 'vitest'
import { renameColumn } from '../actions/renameColumn'
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
        { city: 'Bogotá', country: 'Colombia' },
        { city: 'Santiago', country: 'Chile' },
      ])
    )
    const result = renameColumn(file, 'capital', { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect(result.tables[0]).toEqual(
      flatTable([
        { capital: 'Bogotá', country: 'Colombia' },
        { capital: 'Santiago', country: 'Chile' },
      ])
    )
  })

  it('avoids collision by appending _2', () => {
    const file = makeFile(
      flatTable([{ col1: 'Bogotá', col2: 'Colombia', col3: 'América del Sur' }])
    )
    const result = renameColumn(file, 'col2', { tableIdx: 0, fragmentIdx: 0, colName: 'col1', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ col2_2: 'Bogotá', col2: 'Colombia', col3: 'América del Sur' })
  })

  it('increments suffix beyond _2 when _2 is also taken', () => {
    const file = makeFile(
      flatTable([{ col1: 'Bogotá', col2: 'Colombia', col2_2: 'América del Sur' }])
    )
    const result = renameColumn(file, 'col2', { tableIdx: 0, fragmentIdx: 0, colName: 'col1', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ col2_3: 'Bogotá', col2: 'Colombia', col2_2: 'América del Sur' })
  })

  it('renames across all fragments when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable([{ city: 'Bogotá' }], [{ city: 'Santiago' }])
    )
    const result = renameColumn(file, 'capital', { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ capital: 'Bogotá' })
    expect(fragments[1].rows[0]).toEqual({ capital: 'Santiago' })
  })

  it('renames only the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable([{ city: 'Bogotá' }], [{ city: 'Santiago' }])
    )
    const result = renameColumn(file, 'capital', { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: false })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ capital: 'Bogotá' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago' })
  })

  it('collision avoidance only checks the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable([{ city: 'Bogotá' }], [{ city: 'Santiago', capital: 'Santiago Centro' }])
    )
    const result = renameColumn(file, 'capital', { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: false })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ capital: 'Bogotá' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', capital: 'Santiago Centro' })
  })
})
