import { describe, it, expect } from 'vitest'
import type { Row, TablesFile } from '../types'
import { deleteTable } from '../actions/deleteTable'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

describe('deleteTable', () => {
  it('removes the table at the given index', () => {
    const file = makeFile(flatTable([{ name: 'A' }]), flatTable([{ name: 'B' }]))
    expect(deleteTable(file, 0).tables).toEqual([flatTable([{ name: 'B' }])])
  })

  it('removes the last table leaving an empty array', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    expect(deleteTable(file, 0).tables).toEqual([])
  })

  it('removes a middle table, preserving the others in order', () => {
    const file = makeFile(
      flatTable([{ name: 'A' }]),
      flatTable([{ name: 'B' }]),
      flatTable([{ name: 'C' }])
    )
    expect(deleteTable(file, 1).tables).toEqual([
      flatTable([{ name: 'A' }]),
      flatTable([{ name: 'C' }]),
    ])
  })

  it('does not mutate the original file', () => {
    const file = makeFile(flatTable([{ name: 'A' }]))
    deleteTable(file, 0)
    expect(file.tables).toHaveLength(1)
  })
})
