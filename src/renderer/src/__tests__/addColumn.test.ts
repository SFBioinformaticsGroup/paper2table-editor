import { describe, it, expect } from 'vitest'
import { addColumn } from '../actions/addColumn'
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

describe('addColumn', () => {
  it('appends a null column at the end of each row when afterColName is omitted', () => {
    const file = makeFile(
      flatTable([
        { city: 'Bogotá', country: 'Colombia' },
        { city: 'Santiago', country: 'Chile' },
      ])
    )
    const result = addColumn(file, 0, 'region', undefined, 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { city: 'Bogotá', country: 'Colombia', region: null },
      { city: 'Santiago', country: 'Chile', region: null },
    ])
  })

  it('inserts the new column immediately after afterColName', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia', continent: 'América del Sur' }])
    )
    const result = addColumn(file, 0, 'region', 'country', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      country: 'Colombia',
      region: null,
      continent: 'América del Sur',
    })
  })

  it('avoids name collision by appending _2', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia' }])
    )
    const result = addColumn(file, 0, 'country', undefined, 0, true)
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect('country_2' in row).toBe(true)
    expect(row.country_2).toBeNull()
  })

  it('adds the column to every fragment when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = addColumn(file, 0, 'region', undefined, 0, true)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', country: 'Colombia', region: null })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', country: 'Chile', region: null })
  })

  it('adds the column only to the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = addColumn(file, 0, 'region', undefined, 0, false)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', country: 'Colombia', region: null })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', country: 'Chile' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ city: 'Caracas' }], 5)
    const file = makeFile(flatTable([{ city: 'Bogotá' }]), other)
    const result = addColumn(file, 0, 'country', undefined, 0, true)
    expect(result.tables[1]).toBe(other)
  })
})
