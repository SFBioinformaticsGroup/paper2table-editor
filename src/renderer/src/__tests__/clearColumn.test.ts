import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { clearColumn } from '../actions/clearColumn'

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

describe('clearColumn', () => {
  describe('editColumnsGlobally = true', () => {
    it('nulls out all cells in the targeted column across all fragments', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá', country: 'Colombia' }],
          [{ city: 'Santiago', country: 'Chile' }]
        )
      )
      const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: null, country: 'Colombia' })
      expect(fragments[1].rows[0]).toEqual({ city: null, country: 'Chile' })
    })

    it('nulls all cells in a flat table', () => {
      const file = makeFile(
        flatTable([
          { city: 'Bogotá', country: 'Colombia' },
          { city: 'Santiago', country: 'Chile' },
          { city: 'Lima', country: 'Perú' },
        ])
      )
      const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { city: null, country: 'Colombia' },
        { city: null, country: 'Chile' },
        { city: null, country: 'Perú' },
      ])
    })
  })

  describe('editColumnsGlobally = false', () => {
    it('nulls cells only in the targeted fragment', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Santiago' }]
        )
      )
      const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: false })
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: null })
      expect(fragments[1].rows[0]).toEqual({ city: 'Santiago' })
    })

    it('nulls cells in the second fragment when fragmentIdx = 1', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Santiago' }]
        )
      )
      const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 1, colName: 'city', editColumnsGlobally: false })
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá' })
      expect(fragments[1].rows[0]).toEqual({ city: null })
    })
  })

  it('leaves other columns untouched', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', country: 'Colombia', continent: 'América del Sur' }])
    )
    const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'country', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { city: 'Bogotá', country: null, continent: 'América del Sur' },
    ])
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ city: 'Caracas' }], 5)
    const file = makeFile(flatTable([{ city: 'Bogotá' }]), otherTable)
    const result = clearColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect(result.tables[1]).toBe(otherTable)
  })
})
