import { describe, it, expect } from 'vitest'
import { splitColumn } from '../actions/splitColumn'
import type { Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

describe('splitColumn', () => {
  it('splits at the last comma, putting the head in the original column and tail in a new _tail column', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin, 500mg' }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      drug: 'aspirin',
      drug_tail: '500mg',
    })
  })

  it('splits at the last comma when there are multiple commas', () => {
    const file = makeFile(flatTable([{ value: 'foo, bar, baz' }]))
    const result = splitColumn(file, 0, 'value')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      value: 'foo, bar',
      value_tail: 'baz',
    })
  })

  it('leaves the original column unchanged and sets tail to null when there is no comma', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin' }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      drug: 'aspirin',
      drug_tail: null,
    })
  })

  it('sets both columns to null when the cell is null', () => {
    const file = makeFile(flatTable([{ drug: null }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      drug: null,
      drug_tail: null,
    })
  })

  it('sets tail to null when the value ends with a comma', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin,' }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      drug: 'aspirin',
      drug_tail: null,
    })
  })

  it('trims whitespace from head and tail', () => {
    const file = makeFile(flatTable([{ drug: ' aspirin , 500mg ' }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      drug: 'aspirin',
      drug_tail: '500mg',
    })
  })

  it('inserts the tail column immediately after the split column', () => {
    const file = makeFile(flatTable([{ name: 'X', drug: 'aspirin, 500mg', group: 'NSAID' }]))
    const result = splitColumn(file, 0, 'drug')
    expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
      'name',
      'drug',
      'drug_tail',
      'group',
    ])
  })

  it('preserves other column values unchanged', () => {
    const file = makeFile(flatTable([{ name: 'X', drug: 'aspirin, 500mg', group: 'NSAID' }]))
    const result = splitColumn(file, 0, 'drug')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'X',
      drug: 'aspirin',
      drug_tail: '500mg',
      group: 'NSAID',
    })
  })

  it('generates a unique tail column name when _tail already exists', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin, 500mg', drug_tail: 'existing' }]))
    const result = splitColumn(file, 0, 'drug')
    const resultRow = (result.tables[0] as { rows: Row[] }).rows[0]
    expect(resultRow['drug']).toEqual('aspirin')
    expect(resultRow['drug_tail']).toEqual('existing')
    expect(resultRow['drug_tail_2']).toEqual('500mg')
  })
})
