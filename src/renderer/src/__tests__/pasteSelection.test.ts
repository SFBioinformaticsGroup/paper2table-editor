import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { pasteSelection } from '../actions/pasteSelection'

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

describe('pasteSelection', () => {
  it('pastes cells starting at anchor position', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
        { compound: 'ibuprofen', dose: '200mg' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['naproxen']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'naproxen', dose: '100mg' },
      { compound: 'ibuprofen', dose: '200mg' },
    ])
  })

  it('respects column offsets for multi-column paste', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg', route: 'oral' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['naproxen', '250mg']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'naproxen', dose: '250mg', route: 'oral' },
    ])
  })

  it('respects row offsets for multi-row paste', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
        { compound: 'ibuprofen', dose: '200mg' },
        { compound: 'naproxen', dose: '300mg' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 1, 'compound', [['drug-A'], ['drug-B']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'aspirin', dose: '100mg' },
      { compound: 'drug-A', dose: '200mg' },
      { compound: 'drug-B', dose: '300mg' },
    ])
  })

  it('skips rows out of bounds without crashing or adding rows', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['drug-A'], ['drug-B'], ['drug-C']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'drug-A' },
    ])
  })

  it('skips columns out of bounds without crashing', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 0, 'dose', [['250mg', 'extra-col-value']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: 'aspirin', dose: '250mg' },
    ])
  })

  it('pastes empty string as null', () => {
    const file = makeFile(
      flatTable([
        { compound: 'aspirin', dose: '100mg' },
      ])
    )
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['', '250mg']])
    expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
      { compound: null, dose: '250mg' },
    ])
  })

  it('only modifies the targeted fragment', () => {
    const file = makeFile(
      fragmentedTable(
        [{ compound: 'aspirin' }],
        [{ compound: 'ibuprofen' }]
      )
    )
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['naproxen']])
    const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
    expect(fragments[0].rows[0]).toEqual({ compound: 'naproxen' })
    expect(fragments[1].rows[0]).toEqual({ compound: 'ibuprofen' })
  })

  it('leaves other tables untouched', () => {
    const otherTable = flatTable([{ compound: 'paracetamol' }], 5)
    const file = makeFile(flatTable([{ compound: 'aspirin' }]), otherTable)
    const result = pasteSelection(file, 0, 0, 0, 'compound', [['naproxen']])
    expect(result.tables[1]).toBe(otherTable)
  })
})
