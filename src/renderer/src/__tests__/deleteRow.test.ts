import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { deleteRow } from '../actions/deleteRow'

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

describe('deleteRow', () => {
  it('removes the specified row from a flat table', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }, { name: 'C' }]))
    const result = deleteRow(file, 0, 0, 1)
    expect(result.tables[0]).toEqual(flatTable([{ name: 'A' }, { name: 'C' }]))
  })

  it('removes the first row', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }]))
    const result = deleteRow(file, 0, 0, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([{ name: 'B' }])
  })

  it('removes the last row', () => {
    const file = makeFile(flatTable([{ name: 'A' }, { name: 'B' }]))
    const result = deleteRow(file, 0, 0, 1)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([{ name: 'A' }])
  })

  it('only removes from the targeted fragment, leaving others intact', () => {
    const file = makeFile(
      fragmentedTable([{ name: 'A' }, { name: 'B' }], [{ name: 'C' }])
    )
    const result = deleteRow(file, 0, 0, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0]).toEqual({ rows: [{ name: 'B' }], page: 1 })
    expect(fragments[1]).toEqual({ rows: [{ name: 'C' }], page: 2 })
  })
})
