import { describe, it, expect } from 'vitest'
import { mergeColumns } from '../actions/mergeColumns'
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

describe('mergeColumns', () => {
  it('concatenates keep and drop column values with a space', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', region: '(Cundinamarca)' }])
    )
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá (Cundinamarca)',
    })
  })

  it('concatenates keep and drop column values with no separator', () => {
    const file = makeFile(
      flatTable([{ city: 'Buenos', region: 'Aires' }])
    )
    const result = mergeColumns(file, 0, 'city', 'region', '', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'BuenosAires',
    })
  })

  it('omits an empty keep value from the no-separator concatenation', () => {
    const file = makeFile(flatTable([{ city: '', region: 'Colombia' }]))
    const result = mergeColumns(file, 0, 'city', 'region', '', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ city: 'Colombia' })
  })

  it('drops the drop column from the row', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá', region: 'Cundinamarca' }]))
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    expect('region' in (result.tables[0] as { rows: Row[] }).rows[0]).toBe(false)
  })

  it('omits an empty keep value from the concatenation', () => {
    const file = makeFile(flatTable([{ city: '', region: 'Colombia' }]))
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ city: 'Colombia' })
  })

  it('omits a null drop value from the concatenation', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá', region: null }]))
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ city: 'Bogotá' })
  })

  it('preserves other columns unchanged', () => {
    const file = makeFile(
      flatTable([{ city: 'Bogotá', region: 'Cundinamarca', continent: 'América del Sur' }])
    )
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá Cundinamarca',
      continent: 'América del Sur',
    })
  })

  it('merges across all fragments when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', region: 'Cundinamarca' }],
        [{ city: 'Santiago', region: 'Metropolitana' }]
      )
    )
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, true)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá Cundinamarca' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago Metropolitana' })
  })

  it('merges only the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá', region: 'Cundinamarca' }],
        [{ city: 'Santiago', region: 'Metropolitana' }]
      )
    )
    const result = mergeColumns(file, 0, 'city', 'region', ' ', 0, false)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá Cundinamarca' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', region: 'Metropolitana' })
  })
})
