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

describe('splitColumn — comma strategy', () => {
  it('splits at the last comma, putting the head in the original column and tail in a new _tail column', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá, Colombia' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: 'Colombia',
    })
  })

  it('splits at the last comma when there are multiple commas', () => {
    const file = makeFile(flatTable([{ city: 'Santiago, Región Metropolitana, Chile' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Santiago, Región Metropolitana',
      city_tail: 'Chile',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there is no comma', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ city: null }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: null,
      city_tail: null,
    })
  })

  it('sets tail to null when the value ends with a comma', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá,' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: null,
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ city: ' Bogotá , Colombia ' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      city: 'Bogotá',
      city_tail: 'Colombia',
    })
  })

  it('inserts the tail column immediately after the split column', () => {
    const file = makeFile(flatTable([{ continent: 'América del Sur', city: 'Bogotá, Colombia', population: '8M' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
      'continent',
      'city',
      'city_tail',
      'population',
    ])
  })

  it('preserves other column values unchanged', () => {
    const file = makeFile(flatTable([{ continent: 'América del Sur', city: 'Bogotá, Colombia', population: '8M' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      continent: 'América del Sur',
      city: 'Bogotá',
      city_tail: 'Colombia',
      population: '8M',
    })
  })

  it('generates a unique tail column name when _tail already exists', () => {
    const file = makeFile(flatTable([{ city: 'Bogotá, Colombia', city_tail: 'existing' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
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
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: true }, 'comma')
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
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'city', editColumnsGlobally: false }, 'comma')
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá', city_tail: 'Colombia' })
    expect(fragments[1].rows[0]).toEqual({ city: 'Lima, Perú' })
  })
})

describe('splitColumn — parentheses strategy', () => {
  it('extracts the content of the last parenthesised group as tail', () => {
    const file = makeFile(flatTable([{ value: 'hola (todo el) (mundo)' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: 'hola (todo el)',
      value_tail: 'mundo',
    })
  })

  it('splits at the last parenthesised group when there is only one', () => {
    const file = makeFile(flatTable([{ value: 'Colombia (South America)' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: 'Colombia',
      value_tail: 'South America',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there are no parentheses', () => {
    const file = makeFile(flatTable([{ value: 'no parens here' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: 'no parens here',
      value_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ value: null }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: null,
      value_tail: null,
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ value: '  Colombia  (  South America  )  ' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: 'Colombia',
      value_tail: 'South America',
    })
  })

  it('sets head to null when everything before the opening paren is whitespace', () => {
    const file = makeFile(flatTable([{ value: '(solo)' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'value', editColumnsGlobally: true }, 'parentheses')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: null,
      value_tail: 'solo',
    })
  })
})

describe('splitColumn — period strategy', () => {
  it('splits at the last period after stripping trailing periods', () => {
    const file = makeFile(flatTable([{ sentence: 'hola. mundo.' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: 'hola',
      sentence_tail: 'mundo',
    })
  })

  it('splits at the last period when there are multiple periods', () => {
    const file = makeFile(flatTable([{ sentence: 'one. two. three.' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: 'one. two',
      sentence_tail: 'three',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there is no period', () => {
    const file = makeFile(flatTable([{ sentence: 'no period here' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: 'no period here',
      sentence_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ sentence: null }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: null,
      sentence_tail: null,
    })
  })

  it('strips multiple trailing periods before splitting', () => {
    const file = makeFile(flatTable([{ sentence: 'hola. mundo...' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: 'hola',
      sentence_tail: 'mundo',
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ sentence: ' hola .  mundo . ' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'sentence', editColumnsGlobally: true }, 'period')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      sentence: 'hola',
      sentence_tail: 'mundo',
    })
  })
})

describe('splitColumn — slash strategy', () => {
  it('splits at the last slash after stripping trailing slashes', () => {
    const file = makeFile(flatTable([{ path: 'a/b/' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: 'a',
      path_tail: 'b',
    })
  })

  it('splits at the last slash when there are multiple slashes', () => {
    const file = makeFile(flatTable([{ path: 'one/two/three' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: 'one/two',
      path_tail: 'three',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there is no slash', () => {
    const file = makeFile(flatTable([{ path: 'no slash here' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: 'no slash here',
      path_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ path: null }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: null,
      path_tail: null,
    })
  })

  it('strips multiple trailing slashes before splitting', () => {
    const file = makeFile(flatTable([{ path: 'a/b///' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: 'a',
      path_tail: 'b',
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ path: ' a / b ' }]))
    const result = splitColumn(file, { tableIdx: 0, fragmentIdx: 0, colName: 'path', editColumnsGlobally: true }, 'slash')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      path: 'a',
      path_tail: 'b',
    })
  })
})
