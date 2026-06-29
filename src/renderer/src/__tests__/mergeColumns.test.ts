import { describe, it, expect } from 'vitest'
import { mergeColumns } from '../actions/mergeColumns'
import type { Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

describe('mergeColumns', () => {
  it('concatenates keep and drop column values with a space', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', suffix: '(tablet)' }])
    )
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin (tablet)',
    })
  })

  it('drops the drop column from the row', () => {
    const file = makeFile(flatTable([{ name: 'A', suffix: 'B' }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect('suffix' in (result.tables[0] as { rows: Row[] }).rows[0]).toBe(false)
  })

  it('omits an empty keep value from the concatenation', () => {
    const file = makeFile(flatTable([{ name: '', suffix: '(tablet)' }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: '(tablet)' })
  })

  it('omits a null drop value from the concatenation', () => {
    const file = makeFile(flatTable([{ name: 'aspirin', suffix: null }]))
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({ name: 'aspirin' })
  })

  it('preserves other columns unchanged', () => {
    const file = makeFile(
      flatTable([{ name: 'aspirin', suffix: '500mg', group: 'NSAID' }])
    )
    const result = mergeColumns(file, 0, 'name', 'suffix')
    expect((result.tables[0] as { rows: Row[] }).rows[0]).toEqual({
      name: 'aspirin 500mg',
      group: 'NSAID',
    })
  })
})
