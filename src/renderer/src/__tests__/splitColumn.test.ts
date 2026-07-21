import { describe, it, expect } from 'vitest'
import { splitColumn } from '../actions/splitColumn'
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

describe('splitColumn', () => {
  it('splits at the last comma, putting the head in the original column and tail in a new _tail column', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá, Colombia' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: 'Colombia',
    })
  })

  it('splits at the last comma when there are multiple commas', () => {
    const file = makeFile(flatTable([{ city: 'Santiago, Región Metropolitana, Chile' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Santiago, Región Metropolitana',
      city_tail: 'Chile',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there is no comma', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ city: null }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: null,
      city_tail: null,
    })
  })

  it('sets tail to null when the value ends with a comma', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá,' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: null,
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ city: ' Bogotá , Colombia ' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: 'Colombia',
    })
  })

  it('inserts the tail column immediately after the split column', () => {
    const file = makeFile(flatTable([{ continent: 'América del Sur', city: 'Bogotá, Colombia', population: '8M' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
      'continent',
      'city',
      'city_tail',
      'population',
    ])
  })

  it('preserves other column values unchanged', () => {
    const file = makeFile(flatTable([{ continent: 'América del Sur', city: 'Bogotá, Colombia', population: '8M' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      continent: 'América del Sur',
      city: 'Bogotá',
      city_tail: 'Colombia',
      population: '8M',
    })
  })

  it('generates a unique tail column name when _tail already exists', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá, Colombia', city_tail: 'existing' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    const resultRow = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(resultRow['city']).toEqual('Bogotá')
    expect(resultRow['city_tail']).toEqual('existing')
    expect(resultRow['city_tail_2']).toEqual('Colombia')
  })

  it('splits across all fragments when editColumnsGlobally = true', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá, Colombia' }],
        [{ city: 'Lima, Perú' }]
      )
    )
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', city_tail: 'Colombia' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Lima', city_tail: 'Perú' })
  })

  it('splits only the targeted fragment when editColumnsGlobally = false', () => {
    const file = makeFile(
      fragmentedTable(
        [{ city: 'Bogotá, Colombia' }],
        [{ city: 'Lima, Perú' }]
      )
    )
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: false })
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', city_tail: 'Colombia' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Lima, Perú' })
  })
})
