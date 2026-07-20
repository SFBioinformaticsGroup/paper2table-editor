import { describe, it, expect } from 'vitest'
import { mapColumnFragments } from '../utils/mapColumnFragments'
import type { TablesFile, TableFragment, Row } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function fragmentedTable(...groups: Row[][]): TablesFile['tables'][number] {
  return {
    table_fragments: groups.map((rows, i) => ({ rows, page: i + 1 })),
  }
}

function markFragment(fragment: TableFragment): TableFragment {
  return { ...fragment, rows: fragment.rows.map((row) => ({ ...row, touched: 'yes' })) }
}

describe('mapColumnFragments', () => {
  describe('editColumnsGlobally = true', () => {
    it('applies the transform to all fragments', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Lima' }]
        )
      )
      const result = mapColumnFragments(file, 0, 0, true, markFragment)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', touched: 'yes' })
      expect(fragments[1].rows[0]).toEqual({ city: 'Lima', touched: 'yes' })
    })

    it('applies the transform regardless of which fragmentIdx is passed', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Lima' }]
        )
      )
      const result = mapColumnFragments(file, 0, 1, true, markFragment)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', touched: 'yes' })
      expect(fragments[1].rows[0]).toEqual({ city: 'Lima', touched: 'yes' })
    })
  })

  describe('editColumnsGlobally = false', () => {
    it('applies the transform only to the targeted fragment', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Lima' }]
        )
      )
      const result = mapColumnFragments(file, 0, 0, false, markFragment)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', touched: 'yes' })
      expect(fragments[1].rows[0]).toEqual({ city: 'Lima' })
    })

    it('applies to the second fragment when fragmentIdx = 1', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Lima' }]
        )
      )
      const result = mapColumnFragments(file, 0, 1, false, markFragment)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá' })
      expect(fragments[1].rows[0]).toEqual({ city: 'Lima', touched: 'yes' })
    })
  })

  it('leaves other tables untouched in both modes', () => {
    const otherTable = { rows: [{ city: 'Caracas' }], page: 5 }
    const file = makeFile(
      fragmentedTable([{ city: 'Bogotá' }]),
      otherTable
    )
    const result = mapColumnFragments(file, 0, 0, true, markFragment)
    expect(result.tables[1]).toBe(otherTable)
  })
})
