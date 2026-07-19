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
  it('nulls out all cells in the targeted column', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
        { compound: 'ibuprofen', dose: '200mg' },
        { compound: 'naproxen', dose: '300mg' },
      ])
    )
    const result = clearColumn(file, 0, 0, 'compound')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: null, dose: '100mg' },
      { compound: null, dose: '200mg' },
      { compound: null, dose: '300mg' },
    ])
  })

  it('leaves other columns untouched', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg', route: 'oral' },
      ])
    )
    const result = clearColumn(file, 0, 0, 'dose')
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'aspirin', dose: null, route: 'oral' },
    ])
  })

  it('only clears the targeted fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ compound: 'aspirin' }],
        [{ compound: 'ibuprofen' }]
      )
    )
    const result = clearColumn(file, 0, 0, 'compound')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([{ compound: null }])
    expect(fragments[1].rows).toEqual([{ compound: 'ibuprofen' }])
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ compound: 'paracetamol' }], 5)
    const file = makeFile(flatTable([{ compound: 'aspirin' }]), otherTable)
    const result = clearColumn(file, 0, 0, 'compound')
    expect(result.tables[1]).toBe(otherTable)
  })
})
