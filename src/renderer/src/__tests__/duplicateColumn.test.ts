import { describe, it, expect } from 'vitest'
import { duplicateColumn } from '../actions/duplicateColumn'
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

describe('duplicateColumn', () => {
  it('inserts a copy of the column immediately after the source column', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia', continent: 'América del Sur' }])
    )
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      country: 'Colombia',
      country_2: 'Colombia',
      continent: 'América del Sur',
    })
  })

  it('copies the column values including null', () => {
    const file = makeFile(
      flatTable([
        { city: 'Bogotá', country: 'Colombia' },
        { city: 'Santiago', country: null },
      ])
    )
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    const rows = (result.tables[0] as { rows: Row[] }).rows
    expect(rows).toEqual([
      { city: 'Bogotá', country: 'Colombia', country_2: 'Colombia' },
      { city: 'Santiago', country: null, country_2: null },
    ])
  })

  it('uses uniqueName to avoid collisions (appends _2, _3)', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia', country_2: 'Chile' }])
    )
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    const row = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(row).toEqual({ city: 'Bogotá', country: 'Colombia', country_2: 'Chile', country_3: 'Colombia' })
  })

  it('duplicates across all fragments when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', country: 'Colombia', country_2: 'Colombia' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', country: 'Chile', country_2: 'Chile' })
  })

  it('duplicates only the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', country: 'Colombia' }],
        [{ city: 'Santiago', country: 'Chile' }]
      )
    )
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: false })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', country: 'Colombia', country_2: 'Colombia' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', country: 'Chile' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ city: 'Caracas' }], 5)
    const file = makeFile(flatTable([{ city: 'Bogotá', country: 'Colombia' }]), other)
    const result = duplicateColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect(result.tables[1]).toBe(other)
  })
})
