import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { reverseText } from '../actions/reverseText'

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

describe('reverseText', () => {
  it('reverses the characters of each string cell value', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', dose: '500mg' }])
    )
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'niripsa',
      dose: 'gm005',
    })
  })

  it('leaves null values unchanged', () => {
    const file = makeFile(flatTable([{ name: null }]))
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: null })
  })

  it('leaves number values unchanged', () => {
    const file = makeFile(flatTable([{ count: 42 }]))
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ count: 42 })
  })

  it('reverses each value string inside a ValueWithAgreement array', () => {
    const file = makeFile(
      flatTable([{
        name: [
          { value: 'aspirin', agreement_level: 3 },
          { value: 'ASA', agreement_level: 1 },
        ],
      }])
    )
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: [
        { value: 'niripsa', agreement_level: 3 },
        { value: 'ASA', agreement_level: 1 },
      ],
    })
  })

  it('leaves agreement_level_ unchanged', () => {
    const file = makeFile(flatTable([{ name: 'aspirin', agreement_level_: 3 }]))
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0].agreement_level_).toBe(3)
  })

  it('leaves sources_ unchanged', () => {
    const file = makeFile(flatTable([{ name: 'aspirin', sources_: ['uuid-1'] }]))
    const result = reverseText(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows[0].sources_).toEqual(['uuid-1'])
  })

  it('reverses all rows across all fragments', () => {
    const file = makeFile(
      fragmentedTable(
        [{ name: 'aspirin' }],
        [{ name: 'ibuprofen' }]
      )
    )
    const result = reverseText(file, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ name: 'niripsa' })
    expect(fragments[1].rows[0]).toEqual({ name: 'neforpubi' })
  })

  it('leaves other tables untouched', () => {
    const other = flatTable([{ name: 'X' }], 5)
    const file = makeFile(flatTable([{ name: 'A' }]), other)
    const result = reverseText(file, 0)
    expect(result.tables[1]).toBe(other)
  })
})
