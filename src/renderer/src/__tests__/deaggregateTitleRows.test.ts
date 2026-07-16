import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { deaggregateTitleRows } from '../actions/deaggregateTitleRows'

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

describe('deaggregateTitleRows', () => {
  it('adds a "group" column to each data row with the preceding header value', () => {
    const file = makeFile(
      flatTable([
        { treatment: 'TREATMENT A', dose: null },
        { treatment: null, dose: '10mg' },
        { treatment: null, dose: '20mg' },
      ])
    )
    const result = deaggregateTitleRows(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { group: 'TREATMENT A', treatment: null, dose: '10mg' },
      { group: 'TREATMENT A', treatment: null, dose: '20mg' },
    ])
  })

  it('handles multiple groups with an empty row between them', () => {
    const file = makeFile(
      flatTable([
        { treatment: 'TREATMENT A', dose: null },
        { treatment: null, dose: '10mg' },
        { treatment: null, dose: null },
        { treatment: 'TREATMENT B', dose: null },
        { treatment: null, dose: '30mg' },
      ])
    )
    const result = deaggregateTitleRows(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { group: 'TREATMENT A', treatment: null, dose: '10mg' },
      { group: 'TREATMENT B', treatment: null, dose: '30mg' },
    ])
  })

  it('adds group: null to data rows that appear before any header row', () => {
    const file = makeFile(
      flatTable([
        { treatment: null, dose: 'early' },
        { treatment: 'TREATMENT A', dose: null },
        { treatment: null, dose: 'late' },
      ])
    )
    const result = deaggregateTitleRows(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { group: null, treatment: null, dose: 'early' },
      { group: 'TREATMENT A', treatment: null, dose: 'late' },
    ])
  })

  it('does not treat a mixed-case first-column value as a group header', () => {
    const file = makeFile(
      flatTable([
        { treatment: 'Treatment A', dose: null },
        { treatment: null, dose: '10mg' },
      ])
    )
    const result = deaggregateTitleRows(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { group: null, treatment: 'Treatment A', dose: null },
      { group: null, treatment: null, dose: '10mg' },
    ])
  })

  it('removes completely empty rows', () => {
    const file = makeFile(
      flatTable([
        { treatment: null, dose: null },
        { treatment: 'TREATMENT A', dose: null },
        { treatment: null, dose: null },
        { treatment: null, dose: '10mg' },
      ])
    )
    const result = deaggregateTitleRows(file, 0)
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { group: 'TREATMENT A', treatment: null, dose: '10mg' },
    ])
  })

  it('applies the transformation independently to each fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [
          { treatment: 'TREATMENT A', dose: null },
          { treatment: null, dose: '10mg' },
        ],
        [
          { treatment: 'TREATMENT B', dose: null },
          { treatment: null, dose: '20mg' },
        ]
      )
    )
    const result = deaggregateTitleRows(file, 0)
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows).toEqual([
      { group: 'TREATMENT A', treatment: null, dose: '10mg' },
    ])
    expect(fragments[1].rows).toEqual([
      { group: 'TREATMENT B', treatment: null, dose: '20mg' },
    ])
  })

  it('leaves other tables in the file untouched', () => {
    const other = flatTable([{ treatment: 'UNCHANGED', dose: null }], 5)
    const file = makeFile(
      flatTable([
        { treatment: 'TREATMENT A', dose: null },
        { treatment: null, dose: '10mg' },
      ]),
      other
    )
    const result = deaggregateTitleRows(file, 0)
    expect(result.tables[1]).toBe(other)
  })
})
